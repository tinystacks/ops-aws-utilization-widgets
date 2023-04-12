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
  data?: { [ key: string ]: any }
}

export type Utilization<ScenarioTypes extends string> = {
  [ resourceArn: string ]: Resource<ScenarioTypes>
}


export type AwsServiceOverrides = {
  resourceArn: string,
  scenarioType: string,
  delete?: boolean,
  scaleDown?: boolean,
  optimize?: boolean,
  userInput: { [ key: string ]: any }
}

export type AwsUtilizationOverrides = {
  [ serviceName: string ]: AwsServiceOverrides
}