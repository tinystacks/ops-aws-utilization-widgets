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

  protected async identifyCloudformationStack (credentials: any) {
    const resourcesPerRegion: { 
      [ region: string ]: { 
        resourceArn: string, 
        resourceId: string,
        associatedResourceId?: string
      }[]
    } = {};
    for (const resourceArn in this.utilization) {
      const resource = this.utilization[resourceArn];
      const region = resource.data.region;
      if (!(region in resourcesPerRegion)) {
        resourcesPerRegion[region] = [];
      }
      resourcesPerRegion[region].push({
        resourceArn,
        resourceId: resource.data.resourceId,
        associatedResourceId: resource.data.associatedResourceId
      });
    }
    for (const region in resourcesPerRegion) {
      const cfnClient = new CloudFormation({
        credentials,
        region
      });
      void await Promise.all(resourcesPerRegion[region].map(async (resource) => {
        await cfnClient.describeStackResources({
          PhysicalResourceId: resource.associatedResourceId ? resource.associatedResourceId : resource.resourceId
        }).then((res) => {
          this.addData(resource.resourceArn, 'stack', res.StackResources[0].StackId);
        }).catch(() => { return; });
      }));
    }
  }

  public set utilization (utilization: Utilization<ScenarioTypes>) { this._utilization = utilization; }

  public get utilization () { return this._utilization; }
}