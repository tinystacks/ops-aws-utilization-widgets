import { CloudWatchLogs, DescribeLogGroupsCommandOutput, LogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceOverrides } from '../types/types.js';
import { AwsServiceUtilization } from './aws-service-utilization.js';

// 1. idenitfy scenarios, cpu < 50%
// 2. Drop scenario into warning or alert, associating action type with it
// 3. Implementing those action types

// Since actions are stored per scenario in resource, actions can conflict with each other
// Ex. Logs could not have had an event for 30 days so we recommend deleting it
// it could also have too many stored bytes so we recommend exporting it, but we can't export if we delete first
// We could create a priority system, execute alarm rec's first and fail the other actions gracefully, etc.
// Could also provide an option to export here first then delete

type AwsCloudwatchLogsUtilizationScenarioTypes = 'retentionInDays' | 'lastEventTime' | 'storedBytes';

export class AwsCloudwatchLogsUtilization extends AwsServiceUtilization<AwsCloudwatchLogsUtilizationScenarioTypes> {

  constructor () {
    super();
  }

  async deleteLogGroup (cwLogsClient: CloudWatchLogs, logGroupName: string) {
    await cwLogsClient.deleteLogGroup({
      logGroupName
    });
  }

  async createExportTask (cwLogsClient: CloudWatchLogs, logGroupName: string, bucket: string) {
    await cwLogsClient.createExportTask({
      logGroupName,
      destination: bucket,
      from: 0,
      to: 0
    });
  }

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string,  _overrides?: AwsServiceOverrides) {
    const cwLogsClient = new CloudWatchLogs({
      credentials: await awsCredentialsProvider.getCredentials(),
      region
    });
    let logGroups: LogGroup[] = [];
    let describeLogGroupsRes: DescribeLogGroupsCommandOutput;
    do {
      describeLogGroupsRes = await cwLogsClient.describeLogGroups({
        nextToken: describeLogGroupsRes?.nextToken
      });
      logGroups = [ ...logGroups, ...describeLogGroupsRes.logGroups ];
    } while (describeLogGroupsRes.nextToken);

    void await Promise.all(logGroups.map(async (logGroup) => {
      if (!logGroup?.retentionInDays) {
        this.addScenario(logGroup?.logGroupName, 'retentionInDays', {
          value: logGroup?.retentionInDays?.toString(),
          optimize: {
            action: 'TODO',
            reason: 'this log group does not have a retention policy'
          }
        });
        const describeLogStreamsRes = await cwLogsClient.describeLogStreams({
          logGroupName: logGroup.logGroupName,
          orderBy: 'LastEventTime',
          descending: true,
          limit: 1
        });
        const lastEventTime = describeLogStreamsRes.logStreams[0]?.lastEventTimestamp;
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (lastEventTime < thirtyDaysAgo) {
          this.addScenario(logGroup?.logGroupName, 'lastEventTime', {
            value: lastEventTime.toString(),
            delete: {
              action: 'deleteLogGroup',
              reason: 'this log group has not had an event in over 30 days'
            }
          });
        } else if (lastEventTime < sevenDaysAgo) {
          this.addScenario(logGroup?.logGroupName, 'lastEventTime', {
            value: lastEventTime.toString(),
            optimize: {
              action: 'TODO',
              reason: 'this log group has not had an event in over 7 days'
            }
          });
        }
        const storedBytes = logGroup?.storedBytes;
        // TODO: change limit compared
        if (storedBytes > 100) {
          this.addScenario(logGroup?.logGroupName, 'storedBytes', {
            value: storedBytes.toString(),
            scaleDown: {
              action: 'createExportTask',
              reason: 'this log group has more than 100 bytes of stored data'
            }
          });
        }
      }
    }));
  }
}