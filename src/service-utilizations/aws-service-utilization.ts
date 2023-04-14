import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { Resource, Scenario, Utilization } from '../types/types';

export abstract class AwsServiceUtilization<ScenarioTypes extends string> {
  private _utilization: Utilization<ScenarioTypes>;

  constructor () {
    this._utilization = {};
  }

  abstract getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string, overrides?: any): void | Promise<void>;

  protected addScenario (resourceArn: string, scenarioType: ScenarioTypes, scenario: Scenario) {
    if (!(resourceArn in this.utilization)) {
      this.utilization[resourceArn] = {
        scenarios: {}
      } as Resource<ScenarioTypes>;
    }
    this.utilization[resourceArn].scenarios[scenarioType] = scenario;
  }

  protected addData (resourceArn: string, dataType: string, value: any) {
    if (!(resourceArn in this.utilization)) {
      this.utilization[resourceArn] = {} as Resource<ScenarioTypes>;
    }
    this.utilization[resourceArn].data[dataType] = value;
  }

  public set utilization (utilization: Utilization<ScenarioTypes>) { this._utilization = utilization; }

  public get utilization () { return this._utilization; }
}