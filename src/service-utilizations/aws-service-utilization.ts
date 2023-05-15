import { CloudFormation } from '@aws-sdk/client-cloudformation';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { Data, Resource, Scenario, Utilization } from '../types/types';

export abstract class AwsServiceUtilization<ScenarioTypes extends string> {
  private _utilization: Utilization<ScenarioTypes>;

  constructor () {
    this._utilization = {};
  }

  abstract getUtilization (
    awsCredentialsProvider: AwsCredentialsProvider, regions?: string[], overrides?: any
  ): void | Promise<void>;

  abstract doAction (
    awsCredentialsProvider: AwsCredentialsProvider, actionName: string, resourceId: string, region: string
  ): void | Promise<void>;

  protected addScenario (resourceArn: string, scenarioType: ScenarioTypes, scenario: Scenario) {
    if (!(resourceArn in this.utilization)) {
      this.utilization[resourceArn] = {
        scenarios: {},
        data: {}
      } as Resource<ScenarioTypes>;
    }
    this.utilization[resourceArn].scenarios[scenarioType] = scenario;
  }

  protected addData (resourceArn: string, dataType: keyof Data, value: any) {
    // only add data if recommendation exists for resource
    if (resourceArn in this.utilization) {
      this.utilization[resourceArn].data[dataType] = value;
    }
  }

  protected async identifyCloudformationStack (
    credentials: any, region: string, resourceArn: string, resourceId: string, associatedResourceId?: string
  ) {
    if (resourceArn in this.utilization) {
      const cfnClient = new CloudFormation({
        credentials,
        region
      });
      const stack = await cfnClient.describeStackResources({
        PhysicalResourceId: associatedResourceId ? associatedResourceId : resourceId
      }).then(res => res.StackResources[0].StackId)
        .catch(() => { return; });

      this.addData(resourceArn, 'stack', stack);
    }
  }

  protected getEstimatedMaxMonthlySavings () {
    for (const resourceArn in this.utilization) {
      const scenarios = (this.utilization as Utilization<string>)[resourceArn].scenarios;
      const maxSavingsPerScenario = Object.values(scenarios).map((scenario) => {
        return Math.max(
          scenario.delete?.monthlySavings || 0,
          scenario.scaleDown?.monthlySavings || 0,
          scenario.optimize?.monthlySavings || 0
        );
      });
      const maxSavingsPerResource = Math.max(...maxSavingsPerScenario);
      this.utilization[resourceArn].data.maxMonthlySavings = maxSavingsPerResource;
    }
  }

  public set utilization (utilization: Utilization<ScenarioTypes>) { this._utilization = utilization; }

  public get utilization () { return this._utilization; }
}