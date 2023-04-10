export enum AlertType {
  Warning = 'Warning',
  Alarm = 'Alarm',
}

export type Scenario<K extends keyof ScenarioTypes, ScenarioTypes> = {
  value: ScenarioTypes[K],
  alertType: AlertType,
  reason: string,
  recommendation: string,
  actions: string[]
}

export type Scenarios<ScenarioTypes> = {
  [K in keyof ScenarioTypes]: Scenario<K, ScenarioTypes>
}

export type Utilization<ScenarioTypes> = {
  [resourceName: string]: Scenarios<ScenarioTypes>
}

export type Overrides = { 
    resourceName: string
    scenarioType: string
    userInput: object
}