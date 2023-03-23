import { AwsCloudwatchLogsUtilization } from './aws-cloudwatch-logs-utilization';

export enum AwsService {
  CloudwatchLogs = 'CloudwatchLogs'
}

export class AwsServiceUtilizationFactory {
  static createObject (awsService: AwsService) {
    switch (awsService) {
      case AwsService.CloudwatchLogs:
        return new AwsCloudwatchLogsUtilization();
    }
  }
}