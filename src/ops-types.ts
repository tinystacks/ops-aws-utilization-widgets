import { Provider, Widget } from '@tinystacks/ops-model';

export type AwsResourceType = 'Account' |
  'CloudwatchLogs' |
  'AutoscalingGroup' |
  'Ec2Instance' |
  'EcsService' |
  'NatGateway' |
  'S3Bucket' |
  'EbsVolume' |
  'RdsInstance';

export type AwsUtilizationRecommendations = Widget & {
  regions?: string[]
};

export type AwsUtilization = Widget & {
  region?: string
}

export type AwsUtilizationProvider = Provider & {
  services?: AwsResourceType[];
  regions?: string[];
};