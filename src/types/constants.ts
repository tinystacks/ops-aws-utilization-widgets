import { AwsResourceType } from './types.js';

export const Arns = {
  NatGateway (region: string, accountId: string, natGatewayId: string) {
    return `arn:aws:ec2:${region}:${accountId}:natgateway/${natGatewayId}`;
  }
};

// Because typescript enums transpile strangely and are even discouraged by typescript themselves:
// Source: https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
export const AwsResourceTypes: {
  [key: AwsResourceType | string]: AwsResourceType
} = {
  Account: 'Account',
  CloudwatchLogs: 'CloudwatchLogs',
  AutoscalingGroup: 'AutoscalingGroup',
  Ec2Instance: 'Ec2Instance',
  EcsService: 'EcsService',
  NatGateway: 'NatGateway',
  S3Bucket: 'S3Bucket',
  EbsVolume: 'EbsVolume',
  RdsInstance: 'RdsInstance'
} as const;