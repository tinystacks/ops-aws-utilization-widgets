import { AwsResourceType } from '../ops-types.js';

export const Arns = {
  NatGateway (region: string, accountId: string, natGatewayId: string) {
    return `arn:aws:ec2:${region}:${accountId}:natgateway/${natGatewayId}`;
  },
  Ec2 (region: string, accountId: string, instanceId: string) {
    return `arn:aws:ec2:${region}:${accountId}:instance/${instanceId}`;
  },
  S3 (bucketName: string) {
    return `arn:aws:s3:::${bucketName}`;
  },
  Ebs (region: string, accountId: string, volumeId: string) {
    return `arn:aws:ec2:${region}:${accountId}:volume/${volumeId}`;
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

export const AVG_CPU = 'avgCpu';
export const MAX_CPU = 'maxCpu';
export const AVG_MEMORY = 'avgMemory';
export const MAX_MEMORY = 'maxMemory';
export const DISK_READ_OPS = 'diskReadOps';
export const DISK_WRITE_OPS = 'diskWriteOps';
export const MAX_NETWORK_BYTES_IN = 'maxNetworkBytesIn';
export const MAX_NETWORK_BYTES_OUT = 'maxNetworkBytesOut';
export const AVG_NETWORK_BYTES_IN = 'avgNetworkBytesIn';
export const AVG_NETWORK_BYTES_OUT = 'avgNetworkBytesOut';
export const ALB_REQUEST_COUNT = 'albRequestCount';
export const APIG_REQUEST_COUNT = 'apigRequestCount';