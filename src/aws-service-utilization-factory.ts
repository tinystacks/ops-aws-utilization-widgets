import { AwsCloudwatchLogsUtilization } from './service-utilizations/aws-cloudwatch-logs-utilization.js';
import { s3Utilization } from './service-utilizations/aws-s3-utilization.js';
import { rdsInstancesUtilization } from './service-utilizations/rds-utilization.js';

export enum AwsService {
  CloudwatchLogs = 'CloudwatchLogs', 
  S3 = 'S3', 
  RDS = 'RDS'

}

export class AwsServiceUtilizationFactory {
  static createObject (awsService: AwsService) {
    switch (awsService) {
      case AwsService.CloudwatchLogs:
        return new AwsCloudwatchLogsUtilization();
      case AwsService.S3: 
        return new s3Utilization(); 
      case AwsService.RDS: 
        return new rdsInstancesUtilization();
    }
  }
}