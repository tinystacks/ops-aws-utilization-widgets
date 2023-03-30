import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsCloudwatchLogsUtilization } from './service-utilizations/aws-cloudwatch-logs-utilization.js';

const cwLogs = new AwsCloudwatchLogsUtilization();

const credentialsProvider = AwsCredentialsProvider.fromJson({
  id: 'thing',
  type: 'AwsCredentialsProvider',
  credentials: {
    profileName: 'akash-dev'
  }
});

await cwLogs.getUtilization(credentialsProvider, 'us-east-1');