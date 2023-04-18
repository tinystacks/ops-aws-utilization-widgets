import { LogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { NatGateway } from '@aws-sdk/client-ec2';

export type Data = {
  region: string,
  resourceId: string,
  associatedResourceId?: string,
  stack?: string
  [ key: string ]: any;
}

export type Action = {
  action: string,
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
  data: Data
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
  userInput: UserInput
}

export type AwsUtilizationOverrides = {
  [ serviceName: string ]: AwsServiceOverrides
}

export type NatGatewayWithRegion = {
  region: string,
  natGateway: NatGateway
}

export type LogGroupsPerRegion = {
  [ region: string ]: LogGroup[]
}