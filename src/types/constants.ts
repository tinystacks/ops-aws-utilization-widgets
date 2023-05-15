import { AwsResourceType } from './types.js';

export const Arns = {
  NatGateway (region: string, accountId: string, natGatewayId: string) {
    return `arn:aws:ec2:${region}:${accountId}:natgateway/${natGatewayId}`;
  },
  Ec2 (region: string, accountId: string, instanceId: string) {
    return `arn:aws:ec2:${region}:${accountId}:instance/${instanceId}`;
  },
  S3 (bucketName: string) {
    return `arn:aws:s3:::${bucketName}`;
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

export const ONE_GB_IN_BYTES = 1073741824;