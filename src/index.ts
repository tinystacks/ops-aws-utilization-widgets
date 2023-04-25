// import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
// import { AwsCostSavings } from './aws-cost-savings.js';
// import { AwsCloudwatchLogsUtilization } from './service-utilizations/aws-cloudwatch-logs-utilization.js';

// // const cwLogs = new AwsCloudwatchLogsUtilization();
// // const natGateway = new AwsNatGatewayUtilization();
// const costSavings = new AwsCostSavings({
//     id: '',
//     displayName: '',
//     type: ''
// });

// const credentialsProvider = AwsCredentialsProvider.fromJson({
//   id: 'thing',
//   type: 'AwsCredentialsProvider',
//   credentials: {
//     profileName: 'ts'
//   }
// });

// // cwLogs.getUtilization(credentialsProvider, ['us-east-1', 'us-west-1']);
// costSavings.getData([ credentialsProvider ]);