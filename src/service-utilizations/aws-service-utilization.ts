import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { Scenario, Scenarios, Utilization } from '../types/types';

export abstract class AwsServiceUtilization<ScenarioTypes> {
  private _utilization: Utilization<ScenarioTypes>;

  constructor () {
    this._utilization = {};
  }

  abstract getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string, overrides?: any): void | Promise<void>;

  protected addScenario<K extends keyof ScenarioTypes> (resourceName: string, scenarioType: K, scenario: Scenario<K, ScenarioTypes>) {
    if (!(resourceName in this.utilization)) {
      this.utilization[resourceName] = {} as Scenarios<ScenarioTypes>;
    }
    this.utilization[resourceName][scenarioType] = scenario;
  }

  public set utilization (utilization: Utilization<ScenarioTypes>) { this._utilization = utilization; }

  public get utilization () { return this._utilization; }
}