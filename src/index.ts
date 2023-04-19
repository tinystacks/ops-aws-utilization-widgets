// import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
// import { AwsCloudwatchLogsUtilization } from './service-utilizations/aws-cloudwatch-logs-utilization.js';

// const cwLogs = new AwsCloudwatchLogsUtilization();
// // const natGateway = new AwsNatGatewayUtilization();

// const credentialsProvider = AwsCredentialsProvider.fromJson({
//   id: 'thing',
//   type: 'AwsCredentialsProvider',
//   credentials: {
//     profileName: 'ts'
//   }
// });

// natGateway.getUtilization(credentialsProvider, 'us-east-1');
// cwLogs.getUtilization(credentialsProvider, ['us-east-1', 'us-west-1']);

export function helloWorld () {
  console.log('Hello world!');
}