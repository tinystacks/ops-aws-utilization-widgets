import { CloudWatchLogs, DescribeLogGroupsCommandOutput, LogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AlertType } from '../types/types.js';
import { AwsServiceUtilization } from './aws-service-utilization.js';

// 1. idenitfy scenarios, cpu < 50%
// 2. Drop scenario into warning or alert, associating action type with it
// 3. Implementing those action types

// Since actions are stored per scenario in resource, actions can conflict with each other
// Ex. Logs could not have had an event for 30 days so we recommend deleting it
// it could also have too many stored bytes so we recommend exporting it, but we can't export if we delete first
// We could create a priority system, execute alarm rec's first and fail the other actions gracefully, etc.
// Could also provide an option to export here first then delete

type AwsCloudwatchLogsUtilizationScenarioTypes = {
  retentionInDays?: number;
  lastEventTime?: number;
  storedBytes?: number;
}

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

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string, _overrides?: any) {
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
          value: logGroup?.retentionInDays,
          alertType: AlertType.Warning,
          reason: 'this log group does not have a retention policy',
          recommendation: 'attach a retention policy to this log group',
          actions: []
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
            value: lastEventTime,
            alertType: AlertType.Alarm,
            reason: 'this log group has not had an event in over 30 days',
            recommendation: 'delete this log group. It is unlikely this log group is still in use.',
            actions: [ 'deleteLogGroup' ]
          });
        } else if (lastEventTime < sevenDaysAgo) {
          this.addScenario(logGroup?.logGroupName, 'lastEventTime', {
            value: lastEventTime,
            alertType: AlertType.Warning,
            reason: 'this log group has not had an event in over 7 days',
            recommendation: 'monitor this log group. It may no longer be in use',
            actions: []
          });
        }
        const storedBytes = logGroup?.storedBytes;
        // TODO: change limit compared
        if (storedBytes > 100) {
          this.addScenario(logGroup?.logGroupName, 'storedBytes', {
            value: storedBytes,
            alertType: AlertType.Warning,
            reason: 'this log group has more than 100 bytes of stored data',
            recommendation: 'consider exporting data in this log group to S3',
            actions: [ 'createExportTask' ]
          });
        }
      }
    }));
  }
}