import { CloudWatchLogs, DescribeLogGroupsCommandOutput, LogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';

type AwsCloudwatchLogsUtilizationMetrics = {
  retentionInDays?: string | number | boolean;
  lastEventTime?: string | number | boolean;
  storedBytes?: string | number | boolean;
}
// type AwsCloudwatchLogsUtilizationType = AwsUtilizationType

export class AwsCloudwatchLogsUtilization extends AwsServiceUtilization<AwsCloudwatchLogsUtilization> {
 
  constructor () {
    super();
    // super(props);
  }

  async getAssessment (awsCredentialsProvider: AwsCredentialsProvider, region: string) {
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
      // const {
      //   assessments,
      //   alerts
      // } = this.initUtilizationForResource(logGroup?.logGroupName);
      this.utilization.resources;
      // assessments.retentionInDays = logGroup?.retentionInDays;
      if (!logGroup?.retentionInDays) {
        const describeLogStreamsRes = await cwLogsClient.describeLogStreams({
          logGroupName: logGroup.logGroupName,
          orderBy: 'LastEventTime',
          descending: true,
          limit: 1
        });
        const lastEventTime = describeLogStreamsRes.logStreams[0]?.lastEventTimestamp;
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (lastEventTime < thirtyDaysAgo) {
          // alerts.lastEventTime = '>30d';
          // assessments.lastEventTime = lastEventTime;
        } else if (lastEventTime < sevenDaysAgo) {
          // alerts.lastEventTime = '>7d';
          // assessments.lastEventTime = lastEventTime;
        }
        const storedBytes = logGroup?.storedBytes;
        // TODO: change limit compared
        if (storedBytes > 100) {
          // alerts.storedBytes = '>100';
          // assessments.storedBytes = storedBytes;
        }
      }
    }));
    // console.log(this.resourceUtilization);
  }
}

// 1. idenitfy scenarios, cpu < 50%
// 2. Drop scenario into warning or alert, associating action type with it
// 3. Implementing those action types

// serviceName : {
//   resourceName: [
//       {
//         scenario: string | enum,
//         alert: [{
//           type: "warning" | "alarm" | "recommendaation",
//           actions: [ function () ]
//         }],
//       }
//     ]
// }

  

// assessments: {
//   [key: string]: any
// }

// alerts: {
//   type: "warning" | "alarm" | "recommendation"

// }


//   async getData (providers?: BaseProvider[]): Promise<void> {
//     const awsCredentialsProvider = getAwsCredentialsProvider(providers);
//     const cwLogsClient = new CloudWatchLogs({
//       credentials: await awsCredentialsProvider.getCredentials(),
//       region: this.region
//     });
//     let logGroups: LogGroup[] = [];
//     let describeLogGroupsRes: DescribeLogGroupsCommandOutput;
//     do {
//       describeLogGroupsRes = await cwLogsClient.describeLogGroups({
//         nextToken: describeLogGroupsRes?.nextToken
//       });
//       logGroups = [ ...logGroups, ...describeLogGroupsRes.logGroups ];
//     } while (describeLogGroupsRes.nextToken);

//     void await Promise.all(logGroups.map(async (logGroup) => {
//       const {
//         assessments,
//         alerts
//       } = this.initUtilizationForResource(logGroup?.logGroupName);
//       assessments.retentionInDays = logGroup?.retentionInDays;
//       if (!logGroup?.retentionInDays) {
//         const describeLogStreamsRes = await cwLogsClient.describeLogStreams({
//           logGroupName: logGroup.logGroupName,
//           orderBy: 'LastEventTime',
//           descending: true,
//           limit: 1
//         });
//         const lastEventTime = describeLogStreamsRes.logStreams[0]?.lastEventTimestamp;
//         const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
//         const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
//         if (lastEventTime < thirtyDaysAgo) {
//           alerts.lastEventTime = '>30d';
//           assessments.lastEventTime = lastEventTime;
//         } else if (lastEventTime < sevenDaysAgo) {
//           alerts.lastEventTime = '>7d';
//           assessments.lastEventTime = lastEventTime;
//         }
//         const storedBytes = logGroup?.storedBytes;
//         // TODO: change limit compared
//         if (storedBytes > 100) {
//           alerts.storedBytes = '>100';
//           assessments.storedBytes = storedBytes;
//         }
//       }
//     }));
//     console.log(this.resourceUtilization);
//   }

//   render (): JSX.Element {
//     throw new Error('Method not implemented.');
//   }
// }