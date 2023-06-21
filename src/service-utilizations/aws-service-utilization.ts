import { CloudFormation } from '@aws-sdk/client-cloudformation';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { Data, Metric, Resource, Scenario, Utilization, MetricData } from '../types/types';
import { CloudWatch, Dimension } from '@aws-sdk/client-cloudwatch';

export abstract class AwsServiceUtilization<ScenarioTypes extends string> {
  private _utilization: Utilization<ScenarioTypes>;

  constructor () {
    this._utilization = {};
  }

  /* TODO: all services have a sub getRegionalUtilization function that needs to be deprecated
   * since calls are now region specific
   */
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
        data: {}, 
        metrics: {}
      } as Resource<ScenarioTypes>;
    }
    this.utilization[resourceArn].scenarios[scenarioType] = scenario;
  }

  protected async fillData (
    resourceArn: string, 
    credentials: any, 
    region: string, 
    data: { [ key: keyof Data ]: Data[keyof Data] }
  ) {
    for (const key in data) {
      this.addData(resourceArn, key, data[key]);
    }
    await this.identifyCloudformationStack(
      credentials, 
      region, 
      resourceArn, 
      data.resourceId,
      data.associatedResourceId
    );
    this.getEstimatedMaxMonthlySavings(resourceArn);
  }

  protected addData (resourceArn: string, dataType: keyof Data, value: any) {
    // only add data if recommendation exists for resource
    if (resourceArn in this.utilization) {
      this.utilization[resourceArn].data[dataType] = value;
    }
  }

  protected addMetric (resourceArn: string, metricName: string, metric: Metric){ 
    if(resourceArn in this.utilization){ 
      this.utilization[resourceArn].metrics[metricName] = metric;
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
      await cfnClient.describeStackResources({
        PhysicalResourceId: associatedResourceId ? associatedResourceId : resourceId
      }).then((res) => {
        const stack = res.StackResources[0].StackId;
        this.addData(resourceArn, 'stack', stack);
      }).catch(() => { return; });
    }
  }

  protected getEstimatedMaxMonthlySavings (resourceArn: string) {
    // for (const resourceArn in this.utilization) {
    if (resourceArn in this.utilization) {
      const scenarios = (this.utilization as Utilization<string>)[resourceArn].scenarios;
      const maxSavingsPerScenario = Object.values(scenarios).map((scenario) => {
        return Math.max(
          scenario.delete?.monthlySavings || 0,
          scenario.scaleDown?.monthlySavings || 0,
          scenario.optimize?.monthlySavings || 0
        );
      });
      const maxSavingsForResource = Math.max(...maxSavingsPerScenario);
      this.addData(resourceArn, 'maxMonthlySavings', maxSavingsForResource);
    }
  }

  protected async getSidePanelMetrics (
    credentials: any, region: string, resourceArn: string, 
    nameSpace: string, metricName: string, dimensions: Dimension[]
  ){ 
    
    if(resourceArn in this.utilization){
      const cloudWatchClient = new CloudWatch({ 
        credentials: credentials, 
        region: region
      }); 

      const endTime = new Date(Date.now()); 
      const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); //7 days ago
      const period = 43200; 
    
      const metrics = await cloudWatchClient.getMetricStatistics({ 
        Namespace: nameSpace, 
        MetricName: metricName, 
        StartTime: startTime,
        EndTime: endTime,
        Period: period,
        Statistics: ['Average'],
        Dimensions: dimensions
      });
  
      const values: MetricData[] =  metrics.Datapoints.map(dp => ({ 
        timestamp: dp.Timestamp.getTime(), 
        value: dp.Average
      })).sort((dp1, dp2) => dp1.timestamp - dp2.timestamp);
  
  
      const metricResuls: Metric = { 
        yAxisLabel: metrics.Label || metricName, 
        values: values
      }; 

      this.addMetric(resourceArn , metricName, metricResuls);

    }
  }

  public set utilization (utilization: Utilization<ScenarioTypes>) { this._utilization = utilization; }

  public get utilization () { return this._utilization; }
}