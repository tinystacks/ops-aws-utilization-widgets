import { CloudWatchLogs, DescribeLogGroupsCommandOutput } from '@aws-sdk/client-cloudwatch-logs';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceOverrides, LogGroupsPerRegion } from '../types/types.js';
import { listAllRegions } from '../utils/utils.js';
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

  async setRetentionPolicy (cwLogsClient: CloudWatchLogs, logGroupName: string, retentionInDays: number) {
    await cwLogsClient.putRetentionPolicy({
      logGroupName,
      retentionInDays
    });
  }

  async deleteLogGroup (cwLogsClient: CloudWatchLogs, logGroupName: string) {
    await cwLogsClient.deleteLogGroup({
      logGroupName
    });
  }

  private async getAllLogGroupsPerRegion (credentials: any, regions: string[]) {
    const logGroupsPerRegion: LogGroupsPerRegion = {};
    void await Promise.all(regions.map(async (region) => {
      const cwLogsClient = new CloudWatchLogs({
        credentials,
        region
      });
      let describeLogGroupsRes: DescribeLogGroupsCommandOutput;
      do {
        describeLogGroupsRes = await cwLogsClient.describeLogGroups({
          nextToken: describeLogGroupsRes?.nextToken
        });
        logGroupsPerRegion[region] = describeLogGroupsRes?.logGroups;
      } while (describeLogGroupsRes?.nextToken);
    }));
    return logGroupsPerRegion;
  }

  async createExportTask (cwLogsClient: CloudWatchLogs, logGroupName: string, bucket: string) {
    await cwLogsClient.createExportTask({
      logGroupName,
      destination: bucket,
      from: 0,
      to: Date.now()
    });
  }

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, regions?: string[], _overrides?: AwsServiceOverrides) {
    const credentials = await awsCredentialsProvider.getCredentials();
    const usedRegions = regions || await listAllRegions(credentials);
    const allLogGroupsPerRegion = await this.getAllLogGroupsPerRegion(credentials, usedRegions);
    /* we separate promises per region because of too many simultaneous requests to describeLogStreams
       throttling could still occur in accounts with more log groups, will have to monitor this behavior*/
    for (const region in allLogGroupsPerRegion) {
      void await Promise.all(allLogGroupsPerRegion[region].map(async (logGroup) => {
        const logGroupArn = logGroup?.arn;
        const logGroupName = logGroup?.logGroupName;
        const cwLogsClient = new CloudWatchLogs({
          credentials,
          region
        });
        const retentionInDays = logGroup?.retentionInDays;
        if (!retentionInDays) {
          this.addScenario(logGroupArn, 'retentionInDays', {
            value: retentionInDays?.toString(),
            optimize: {
              action: 'setRetentionPolicy',
              reason: 'this log group does not have a retention policy'
            }
          });
          const describeLogStreamsRes = await cwLogsClient.describeLogStreams({
            logGroupName: logGroupName,
            orderBy: 'LastEventTime',
            descending: true,
            limit: 1
          });
          const lastEventTime = describeLogStreamsRes.logStreams[0]?.lastEventTimestamp;
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          if (lastEventTime < thirtyDaysAgo) {
            this.addScenario(logGroupArn, 'lastEventTime', {
              value: lastEventTime.toString(),
              delete: {
                action: 'deleteLogGroup',
                reason: 'this log group has not had an event in over 30 days'
              }
            });
          } else if (lastEventTime < sevenDaysAgo) {
            this.addScenario(logGroupArn, 'lastEventTime', {
              value: lastEventTime.toString(),
              optimize: {
                action: '',
                reason: 'this log group has not had an event in over 7 days'
              }
            });
          }
          const storedBytes = logGroup?.storedBytes;
          // TODO: change limit compared
          if (storedBytes > 100) {
            this.addScenario(logGroupArn, 'storedBytes', {
              value: storedBytes.toString(),
              scaleDown: {
                action: 'createExportTask',
                reason: 'this log group has more than 100 bytes of stored data'
              }
            });
          }
        }
        this.addData(logGroupArn, 'resourceId', logGroupName);
        this.addData(logGroupArn, 'region', region);
        if (logGroupName.startsWith('/aws')) {
          this.addData(logGroupArn, 'associatedResourceId', logGroupName.split('/')[3]);
        }
      }));
    }
    await this.identifyCloudformationStack(credentials);
    console.log(this.utilization);
  }
}