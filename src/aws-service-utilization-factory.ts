import { awsAccountUtilization } from './service-utilizations/aws-account-utilization.jsx';
import { AwsCloudwatchLogsUtilization } from './service-utilizations/aws-cloudwatch-logs-utilization.js';
import { AwsNatGatewayUtilization } from './service-utilizations/aws-nat-gateway-utilization.js';
import { s3Utilization } from './service-utilizations/aws-s3-utilization.js';
import { ebsVolumesUtilization } from './service-utilizations/ebs-volumes-utilization.jsx';
import { rdsInstancesUtilization } from './service-utilizations/rds-utilization.js';

export enum AwsService {
  CloudwatchLogs = 'CloudwatchLogs', 
  S3 = 'S3', 
  RDS = 'RDS', 
  AwsAccount = 'AwsAccount', 
  NatGatewway = 'NatGatewway', 
  EBS = 'EBS'
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
      case AwsService.AwsAccount: 
        return new awsAccountUtilization(); 
      case AwsService.NatGatewway: 
        return new AwsNatGatewayUtilization(); 
      case AwsService.EBS: 
        return new ebsVolumesUtilization();
    }
  }
}