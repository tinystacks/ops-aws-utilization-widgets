import { AwsCloudwatchLogsUtilization } from './service-utilizations/aws-cloudwatch-logs-utilization.js';

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