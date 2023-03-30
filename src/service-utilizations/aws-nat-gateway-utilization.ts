// import { CloudWatch } from "@aws-sdk/client-cloudwatch";
// import { AwsCredentialsProvider } from "@tinystacks/ops-aws-core-widgets";
// import { AwsServiceUtilization } from "./aws-service-utilization.js";

// type AwsNatGatewayUtilizationScenarioTypes = {
//   activeConnectionCount: number,
//   totalThroughput: number
// }

// export class AwsNatGatewayUtilization extends AwsServiceUtilization<AwsNatGatewayUtilizationScenarioTypes> {

//   async getAssessment(awsCredentialsProvider: AwsCredentialsProvider, region: string, overrides?: any) {
//     const cwClient = new CloudWatch({
//       credentials: await awsCredentialsProvider.getCredentials(),
//       region
//     });

//     const res = await cwClient.getMetricData({
//       MetricDataQueries: [
//         {
//           Id: 'activeConnectionCount',
//           Metrics: 
//         },
//         {
//           Id: 'bytesInFromDestination'
//         },
//         {
//           Id: 'bytesInFromSource'
//         },
//         {
//           Id: 'bytesOutToDestination'
//         },
//         {
//           Id: 'bytesOutToSource'
//         }
//       ],
//       StartTime: new Date(),
//       EndTime: new Date()
//     });
//   }
// }