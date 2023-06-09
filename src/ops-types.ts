import { Provider, Widget } from '@tinystacks/ops-model';

export interface AwsUtilizationRecommendations extends Widget {
  regions?: string[]
}

export interface AwsUtilization extends Widget {
  region?: string
}

export interface AwsUtilizationProvider extends Provider {
  services?: AwsResourceType[];
  regions?: string[];
}

export type AwsResourceType = 'Account' |
  'CloudwatchLogs' |
  'AutoscalingGroup' |
  'Ec2Instance' |
  'EcsService' |
  'NatGateway' |
  'S3Bucket' |
  'EbsVolume' |
  'RdsInstance';