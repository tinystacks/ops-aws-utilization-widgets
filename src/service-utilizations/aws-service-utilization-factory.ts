import { awsAccountUtilization } from './aws-account-utilization.js';
import { AwsCloudwatchLogsUtilization } from './aws-cloudwatch-logs-utilization.js';
import { AwsNatGatewayUtilization } from './aws-nat-gateway-utilization.js';
import { s3Utilization } from './aws-s3-utilization.js';
import { ebsVolumesUtilization } from './ebs-volumes-utilization.js';
import { rdsInstancesUtilization } from './rds-utilization.js';
import HttpError from 'http-errors';
import { AwsResourceTypes } from '../types/constants.js';
import { AwsEc2InstanceUtilization } from './aws-ec2-instance-utilization.js';
import { AwsEcsUtilization } from './aws-ecs-utilization.js';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { AwsResourceType } from '../ops-types.js';

export class AwsServiceUtilizationFactory {
  static createObject (awsService: AwsResourceType): AwsServiceUtilization<string> {
    switch (awsService) {
      case AwsResourceTypes.CloudwatchLogs:
        return new AwsCloudwatchLogsUtilization();
      case AwsResourceTypes.S3Bucket: 
        return new s3Utilization(); 
      case AwsResourceTypes.RdsInstance: 
        return new rdsInstancesUtilization();
      case AwsResourceTypes.Account: 
        return new awsAccountUtilization(); 
      case AwsResourceTypes.NatGateway: 
        return new AwsNatGatewayUtilization(); 
      case AwsResourceTypes.EbsVolume: 
        return new ebsVolumesUtilization();
      case AwsResourceTypes.Ec2Instance:
        return new AwsEc2InstanceUtilization();
      case AwsResourceTypes.EcsService:
        return new AwsEcsUtilization();
      default:
        throw HttpError.BadRequest(`${awsService} is not supported!`);
    }
  }
}