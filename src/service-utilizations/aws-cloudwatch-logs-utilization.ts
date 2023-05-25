import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogs, DescribeLogGroupsCommandOutput, LogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import _ from 'lodash';
import { ONE_GB_IN_BYTES } from '../types/constants.js';
import { AwsServiceOverrides } from '../types/types.js';
import { getHourlyCost, listAllRegions, rateLimitMap } from '../utils/utils.js';
import { AwsServiceUtilization } from './aws-service-utilization.js';

const ONE_HUNDRED_MB_IN_BYTES = 104857600;
const NOW = Date.now();
const oneMonthAgo = NOW - (30 * 24 * 60 * 60 * 1000);
const thirtyDaysAgo = NOW - (30 * 24 * 60 * 60 * 1000);
const sevenDaysAgo = NOW - (7 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = NOW - (14 * 24 * 60 * 60 * 1000);

type AwsCloudwatchLogsUtilizationScenarioTypes = 'hasRetentionPolicy' | 'lastEventTime' | 'storedBytes';

export class AwsCloudwatchLogsUtilization extends AwsServiceUtilization<AwsCloudwatchLogsUtilizationScenarioTypes> {
  constructor () {
    super();
  }

  async doAction (
    awsCredentialsProvider: AwsCredentialsProvider, actionName: string, resourceArn: string, region: string
  ): Promise<void> {
    const resourceId = resourceArn.split(':').at(-2);
    if (actionName === 'deleteLogGroup') {
      const cwLogsClient = new CloudWatchLogs({
        credentials: await awsCredentialsProvider.getCredentials(),
        region
      });

      await this.deleteLogGroup(cwLogsClient, resourceId);
    }

    if(actionName === 'setRetentionPolicy'){ 
      const cwLogsClient = new CloudWatchLogs({
        credentials: await awsCredentialsProvider.getCredentials(),
        region
      });

      await this.setRetentionPolicy(cwLogsClient, resourceId, 90);
    }
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

  async createExportTask (cwLogsClient: CloudWatchLogs, logGroupName: string, bucket: string) {
    await cwLogsClient.createExportTask({
      logGroupName,
      destination: bucket,
      from: 0,
      to: Date.now()
    });
  }

  private async getAllLogGroups (credentials: any, region: string) {
    let allLogGroups: LogGroup[] = [];
    const cwLogsClient = new CloudWatchLogs({
      credentials,
      region
    });
    let describeLogGroupsRes: DescribeLogGroupsCommandOutput;
    do {
      describeLogGroupsRes = await cwLogsClient.describeLogGroups({
        nextToken: describeLogGroupsRes?.nextToken
      });
      allLogGroups = [ ...allLogGroups, ...describeLogGroupsRes?.logGroups || [] ];
    } while (describeLogGroupsRes?.nextToken);

    return allLogGroups;
  }

  private async getEstimatedMonthlyIncomingBytes (
    credentials: any, region: string, logGroupName: string, lastEventTime: number
  ) {
    if (!lastEventTime || lastEventTime < twoWeeksAgo) {
      return 0;
    }

    const cwClient = new CloudWatch({
      credentials,
      region
    });

    // total bytes over last month
    const res = await cwClient.getMetricData({
      StartTime: new Date(oneMonthAgo),
      EndTime: new Date(),
      MetricDataQueries: [
        {
          Id: 'incomingBytes',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/Logs',
              MetricName: 'IncomingBytes',
              Dimensions: [{ Name: 'LogGroupName', Value: logGroupName }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month
            Stat: 'Sum'
          }
        }
      ]
    });
    const monthlyIncomingBytes = _.get(res, 'MetricDataResults[0].Values[0]', 0);

    return monthlyIncomingBytes;
  }

  private async getLogGroupData (credentials: any, region: string, logGroup: LogGroup) {
    const cwLogsClient = new CloudWatchLogs({
      credentials,
      region
    });
    const logGroupName = logGroup?.logGroupName;

    // get data and cost estimate for stored bytes 
    const storedBytes = logGroup?.storedBytes || 0;
    const storedBytesCost = (storedBytes / ONE_GB_IN_BYTES) * 0.03;
    const dataProtectionEnabled = logGroup?.dataProtectionStatus === 'ACTIVATED';
    const dataProtectionCost = dataProtectionEnabled ? storedBytes * 0.12 : 0;
    const monthlyStorageCost = storedBytesCost + dataProtectionCost;

    // get data and cost estimate for ingested bytes
    const describeLogStreamsRes = await cwLogsClient.describeLogStreams({
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 1
    });
    const lastEventTime = describeLogStreamsRes.logStreams[0]?.lastEventTimestamp;
    const estimatedMonthlyIncomingBytes = await this.getEstimatedMonthlyIncomingBytes(
      credentials, 
      region, 
      logGroupName, 
      lastEventTime
    );
    const logIngestionCost = (estimatedMonthlyIncomingBytes / ONE_GB_IN_BYTES) * 0.5;

    // get associated resource
    let associatedResourceId = '';
    if (logGroupName.startsWith('/aws/rds')) {
      associatedResourceId = logGroupName.split('/')[4];
    } else if (logGroupName.startsWith('/aws')) {
      associatedResourceId = logGroupName.split('/')[3];
    }

    return {
      storedBytes,
      lastEventTime,
      monthlyStorageCost,
      totalMonthlyCost: logIngestionCost + monthlyStorageCost,
      associatedResourceId
    };
  }

  private async getRegionalUtilization (credentials: any, region: string, _overrides?: AwsServiceOverrides) {
    const allLogGroups = await this.getAllLogGroups(credentials, region);

    const analyzeLogGroup = async (logGroup: LogGroup) => {
      const logGroupName = logGroup?.logGroupName;
      const logGroupArn = logGroup?.arn;
      const retentionInDays = logGroup?.retentionInDays;
      if (!retentionInDays) {
        const {
          storedBytes,
          lastEventTime,
          monthlyStorageCost,
          totalMonthlyCost,
          associatedResourceId
        } = await this.getLogGroupData(credentials, region, logGroup);

        this.addScenario(logGroupArn, 'hasRetentionPolicy', {
          value: retentionInDays?.toString(),
          optimize: {
            action: 'setRetentionPolicy',
            isActionable: true,
            reason: 'this log group does not have a retention policy',
            monthlySavings: monthlyStorageCost
          }
        });

        // TODO: change limit compared
        if (storedBytes > ONE_HUNDRED_MB_IN_BYTES) {
          this.addScenario(logGroupArn, 'storedBytes', {
            value: storedBytes.toString(),
            scaleDown: {
              action: 'createExportTask',
              isActionable: false,
              reason: 'this log group has more than 100 MB of stored data',
              monthlySavings: monthlyStorageCost
            }
          });
        }
        
        if (lastEventTime < thirtyDaysAgo) {
          this.addScenario(logGroupArn, 'lastEventTime', {
            value: new Date(lastEventTime).toLocaleString(),
            delete: {
              action: 'deleteLogGroup',
              isActionable: true,
              reason: 'this log group has not had an event in over 30 days',
              monthlySavings: totalMonthlyCost
            }
          });
        } else if (lastEventTime < sevenDaysAgo) {
          this.addScenario(logGroupArn, 'lastEventTime', {
            value: new Date(lastEventTime).toLocaleString(),
            optimize: {
              isActionable: false,
              action: '',
              reason: 'this log group has not had an event in over 7 days'
            }
          });
        }
        this.addData(logGroupArn, 'resourceId', logGroupName);
        this.addData(logGroupArn, 'region', region);
        this.addData(logGroupArn, 'monthlyCost', totalMonthlyCost);
        this.addData(logGroupArn, 'hourlyCost', getHourlyCost(totalMonthlyCost));
        await this.identifyCloudformationStack(credentials, region, logGroupArn, logGroupName, associatedResourceId);
        if (associatedResourceId) this.addData(logGroupArn, 'associatedResourceId', associatedResourceId);
      }
    };

    await rateLimitMap(allLogGroups, 5, 5, analyzeLogGroup);
  }

  async getUtilization (
    awsCredentialsProvider: AwsCredentialsProvider, regions?: string[], _overrides?: AwsServiceOverrides
  ) {
    const credentials = await awsCredentialsProvider.getCredentials();
    const usedRegions = regions || await listAllRegions(credentials);
    for (const region of usedRegions) {
      await this.getRegionalUtilization(credentials, region, _overrides);
    }
    this.getEstimatedMaxMonthlySavings();
  }
}