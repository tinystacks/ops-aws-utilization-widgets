import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';

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
  [ K in keyof ScenarioTypes ]: Scenario<K, ScenarioTypes>
}

export type Utilization<ScenarioTypes> = {
  [ resourceName: string ]: Scenarios<ScenarioTypes>
}

export abstract class AwsServiceUtilization<ScenarioTypes> {
  utilization: Utilization<ScenarioTypes>;

  constructor () {
    this.utilization = {};
  }

  abstract getAssessment (awsCredentialsProvider: AwsCredentialsProvider, region: string): void | Promise<void>;

  protected smartFill<K extends keyof ScenarioTypes>(resourceName: string, scenarioType: K, scenario: Scenario<K, ScenarioTypes>) {
    if (!(resourceName in this.utilization)) {
      this.utilization[resourceName] = {} as Scenarios<ScenarioTypes>;
    }
    this.utilization[resourceName][scenarioType] = scenario;
  }
}