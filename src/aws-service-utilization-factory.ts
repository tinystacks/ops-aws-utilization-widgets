import HttpError from 'http-errors';
import { AwsCloudwatchLogsUtilization } from './service-utilizations/aws-cloudwatch-logs-utilization.js';
import { AwsResourceType } from './types/types.js';
import { AwsResourceTypes } from './types/constants.js';
import { AwsEc2InstanceUtilization } from './service-utilizations/aws-ec2-instance-utilization.js';
import { AwsEcsUtilization } from './service-utilizations/aws-ecs-utilization.js';
import { AwsServiceUtilization } from './service-utilizations/aws-service-utilization.js';

export class AwsServiceUtilizationFactory {
  static createObject (awsService: AwsResourceType): AwsServiceUtilization<string> {
    switch (awsService) {
      case AwsResourceTypes.CloudwatchLogs:
        return new AwsCloudwatchLogsUtilization();
      case AwsResourceTypes.Ec2Instance:
        return new AwsEc2InstanceUtilization();
      case AwsResourceTypes.EcsService:
        return new AwsEcsUtilization();
      default:
        throw HttpError.BadRequest(`${awsService} is not supported!`);
    }
  }
}