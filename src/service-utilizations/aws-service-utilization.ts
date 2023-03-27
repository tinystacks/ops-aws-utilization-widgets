import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';

export enum AlertType {
  Warning = 'Warning',
  Alarm = 'Alarm',
}

export type Alert = {
  type: AlertType,
  reason: string,
  recommendation: string,
  actions: { (...args: any[]): void; } []
}

export type Scenarios<ScenarioType> = {
  [ scenario in keyof ScenarioType ]: {
    value: ScenarioType[scenario],
    alert: Alert
  }
}

export type Utilization<ScenarioType> = {
  [ resourceName: string ]: Scenarios<ScenarioType>
}

export abstract class AwsServiceUtilization<ScenarioType> {
  utilization: Utilization<ScenarioType>;

  constructor () {
    this.utilization = {};
  }

  abstract getAssessment (awsCredentialsProvider: AwsCredentialsProvider, region: string): void | Promise<void>;

  protected smartFill<T extends keyof ScenarioType>(resourceName: string, scenario: T, value: ScenarioType[T], alert: Alert) {
    if (!(resourceName in this.utilization)) {
      this.utilization[resourceName] = {} as Scenarios<ScenarioType>;
    }
    this.utilization[resourceName][scenario] = {
      value,
      alert
    }
  }
}