import { LogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { NatGateway } from '@aws-sdk/client-ec2';

export type Data = {
  region: string,
  resourceId: string,
  associatedResourceId?: string,
  stack?: string
  [ key: string ]: any;
}

export type Metrics = { 
  [ metricName: string ]: Metric
}

export type Metric = { 
  yAxisLabel: string, 
  yLimits?: number, 
  values: MetricData[]
}

export type MetricData = { 
  timestamp?: Date;
  value: number
}

export enum ActionType {
  OPTIMIZE='optimize',
  DELETE='delete',
  SCALE_DOWN='scaleDown'
}

export const actionTypeText = {
  [ActionType.OPTIMIZE]: 'optimize',
  [ActionType.DELETE]: 'delete',
  [ActionType.SCALE_DOWN]: 'scale down'
};

export const actionTypeToEnum = {
  [ActionType.OPTIMIZE.toString()]: ActionType.OPTIMIZE,
  [ActionType.DELETE.toString()]: ActionType.DELETE,
  [ActionType.SCALE_DOWN.toString()]: ActionType.SCALE_DOWN
};

export type Action = {
  action: string,
  isActionable: boolean,
  reason: string
}

export type Scenario = {
  value: string,
  delete?: Action,
  scaleDown?: Action,
  optimize?: Action
}

export type Scenarios<ScenarioTypes extends string> = {
  [ scenarioType in ScenarioTypes ]: Scenario
}

export type Resource<ScenarioTypes extends string> = {
  scenarios: Scenarios<ScenarioTypes>,
  data: Data,
  metrics: Metrics
}

export type Utilization<ScenarioTypes extends string> = {
  [ resourceArn: string ]: Resource<ScenarioTypes>
}

export type UserInput = { [ key: string ]: any }

export type AwsServiceOverrides = {
  resourceArn: string,
  scenarioType: string,
  delete?: boolean,
  scaleDown?: boolean,
  optimize?: boolean,
  forceRefesh?: boolean,
  userInput: UserInput
}

export type AwsUtilizationOverrides = {
  [ serviceName: string ]: AwsServiceOverrides
}

export type StabilityStats = {
  mean: number;
  max: number;
  maxZScore: number;
  standardDeviation: number;
  anomalyPercentage?: string;
  wasFiltered: boolean;
  isStable: boolean;
};

/**
 * 
 * @param removeOutliers - default false; Whether to remove outliers from the dataset before running the final stats.
 * @param outlierZScore - default 5; The cutoff Z score (number of standard deviations away from the mean) that is
 *                        considered an outlier.
 * @param anomalyThreshold - default 0.5; The maximum threshold, as a percentage, of anomalies in the dataset required
 *                           to perform outlier removal.  If the percentage of outliers in the dataset is higher that
 *                           this threshold, outliers will not be removed.
 * @param stabilityZScore - default 3; The cutoff Z score (non-inclusive) used to check for stability in the dataset.
 *                          If there are values above this, the dataset is considered unstable.
 */
export type StabilityStatsOptions = {
  removeOutliers?: boolean;
  outlierZScore?: number;
  anomalyThreshold?: number;
  stabilityZScore?: number;
};

export type NatGatewayWithRegion = {
  region: string,
  natGateway: NatGateway
}

export type LogGroupsPerRegion = {
  [ region: string ]: LogGroup[]
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