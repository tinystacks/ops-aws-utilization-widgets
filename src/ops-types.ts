import { Provider, Widget } from '@tinystacks/ops-model';

/**
 * @example
 * ```yaml
 * AwsUtilizationRecommendations:
    type: AwsUtilizationRecommendations
    displayName: TinyStacks Recommendations
    providers: 
      - $ref: '#/Console/providers/AwsProvider'
      - $ref: '#/Console/providers/UtilizationProvider'
 * ```
 */
export interface AwsUtilizationRecommendations extends Widget {
  regions?: string[]
}

export interface AwsUtilization extends Widget {
  region?: string
}

/**
 * @example
 * ```yaml
 * UtilizationProvider:
    type: AwsUtilizationProvider
 * ```
 */
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