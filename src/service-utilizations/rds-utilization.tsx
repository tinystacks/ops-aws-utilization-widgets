import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { AwsServiceOverrides } from '../types/types.js';
import { RDS, DBInstance } from '@aws-sdk/client-rds';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { Pricing } from '@aws-sdk/client-pricing';

export type rdsInstancesUtilizationScenarios = 'hasDatabaseConnections' | 'cpuUtilization' | 'shouldScaleDownStorage' |
                                               'hasAutoScalingEnabled';

export class rdsInstancesUtilization extends AwsServiceUtilization<rdsInstancesUtilizationScenarios> {
  
  async doAction (
    awsCredentialsProvider: AwsCredentialsProvider, actionName: string, resourceArn: string, region: string
  ): Promise<void> {
    if (actionName === 'deleteInstance') {
      const rdsClient = new RDS({
        credentials: await awsCredentialsProvider.getCredentials(),
        region
      });
      const resourceId = resourceArn.split(':').at(-1);
      await this.deleteInstance(rdsClient, resourceId);
    }
  }
  
  constructor () {
    super();
  }

  async deleteInstance (rdsClient: RDS, dbInstanceIdentifier: string){ 
    await rdsClient.deleteDBInstance({ 
      DBInstanceIdentifier: dbInstanceIdentifier
    });
  }

  // TODO: implement serverless cost?
  async getRdsInstanceCost (credentials: any, region: string, dbInstance: DBInstance) {
    const pricingClient = new Pricing({
      credentials,
      region: 'us-east-1'
    });

    let dbEngine = '';
    // if (dbInstance.Engine === 'aurora-mysql') {

    // } else if (dbInstance.Engine === 'aurora-postgresql') {

    // }
    if (dbInstance.Engine.startsWith('aurora')) {
      const parts = dbInstance.Engine.split('-');
      if (parts[1] === 'mysql') {
        dbEngine = 'Aurora MySQL';
      } else {
        dbEngine = 'Aurora PostgreSQL';
      }
    } else {
      dbEngine = dbInstance.Engine;
    }

    const res = await pricingClient.getProducts({
      ServiceCode: 'AmazonRDS',
      Filters: [
        {
          Type: 'TERM_MATCH',
          Field: 'instanceType',
          Value: dbInstance.DBInstanceClass
        },
        {
          Type: 'TERM_MATCH',
          Field: 'regionCode',
          Value: region
        },
        {
          Type: 'TERM_MATCH',
          Field: 'databaseEngine',
          Value: dbEngine
        },
        {
          Type: 'TERM_MATCH',
          Field: 'deploymentOption',
          Value: dbInstance.MultiAZ ? 'Multi-AZ' : 'Single-AZ'
        }
      ]
    });

    const onDemandData = JSON.parse(res.PriceList[0] as string).terms.OnDemand;
    const onDemandKeys = Object.keys(onDemandData);
    const priceDimensionsData = onDemandData[onDemandKeys[0]].priceDimensions;
    const priceDimensionsKeys = Object.keys(priceDimensionsData);
    const pricePerHour = priceDimensionsData[priceDimensionsKeys[0]].pricePerUnit.USD;

    console.log(res.PriceList.length);
    console.log(pricePerHour);
    return pricePerHour * 24 * 30;
  }

  async getUtilization (
    awsCredentialsProvider: AwsCredentialsProvider, regions: string[],  _overrides?: AwsServiceOverrides
  ): Promise<void> {
    const credentials = await awsCredentialsProvider.getCredentials();
    const region = regions[0];
    const rdsClient = new RDS({
      credentials: await awsCredentialsProvider.getCredentials(),
      region: region
    });

    let res = await rdsClient.describeDBInstances({});
    res.DBInstances.map((instance) => { console.log(JSON.stringify(instance, null, 2)); });
    const cost = await this.getRdsInstanceCost(credentials, 'us-east-1', res.DBInstances[0]);
    console.log(cost);

    let dbInstances: DBInstance[] = [];

    dbInstances = [...res.DBInstances]; 

    while(res.Marker){ 
      res = await rdsClient.describeDBInstances({
        Marker: res.Marker 
      }); 
      dbInstances = [...dbInstances, ...res.DBInstances]; 
    }


    const promises: Promise<any>[] = [];
    
    const cloudWatchClient = new CloudWatch({ 
      credentials: await awsCredentialsProvider.getCredentials(), 
      region: region
    }); 

    for (let i = 0; i < dbInstances.length; ++i) {
      promises.push(this.getDatabaseConnections(cloudWatchClient, dbInstances[i].DBInstanceIdentifier));
      promises.push(this.checkInstanceStorage(cloudWatchClient, dbInstances[i]));
      promises.push(this.getCPUUTilization(cloudWatchClient, dbInstances[i].DBInstanceIdentifier));
    }

    void await Promise.all(promises).catch(e => console.log(e));

  }

  async getDatabaseConnections (cloudWatchClient: CloudWatch, dbInstanceIdentifier: string){
    const connectionsRes = await cloudWatchClient.getMetricStatistics({ 
      Namespace: 'AWS/RDS', 
      MetricName: 'DatabaseConnections', 
      StartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      EndTime: new Date(Date.now()),
      Period: 43200,
      Statistics: ['Sum'],
      Dimensions: [{ 
        Name: 'DBInstanceIdentifier', 
        Value: dbInstanceIdentifier
      }]
    }); 

    const dbConnectionStats = connectionsRes.Datapoints.map((data) => { 
      return data.Sum;
    });

    if(dbConnectionStats.length === 0 || dbConnectionStats.every( element => element === 0 )){ 
      this.addScenario(dbInstanceIdentifier, 'hasDatabaseConnections', {
        value: 'false',
        delete: { 
          action: 'deleteInstance', 
          isActionable: true,
          reason: 'This instance does not have any db connections'
        }
      });
    }
  }
  
  async checkInstanceStorage (cloudWatchClient: CloudWatch, dbInstance: DBInstance){ 

    //if theres a maxallocatedstorage then storage auto-scaling is enabled
    if(!dbInstance.MaxAllocatedStorage){ 
      this.addScenario(dbInstance.DBInstanceIdentifier, 'hasAutoScalingEnabled', {
        value: 'false',
        optimize: { 
          action: '', //didnt find an action for this, need to do it in the console
          isActionable: false,
          reason: 'This instance does not have storage auto-scaling turned on'
        }
      });
    }

    //get amount of available storage space 
    const storageSpaceRes = await cloudWatchClient.getMetricStatistics({ 
      Namespace: 'AWS/RDS', 
      MetricName: 'FreeStorageSpace', 
      StartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), //instead of 7 days, should we consider 30 days?
      EndTime: new Date(Date.now()),
      Period: 43200,
      Statistics: ['Sum'],
      Dimensions: [{ 
        Name: 'DBInstanceIdentifier', 
        Value: dbInstance.DBInstanceIdentifier
      }]
    }); 

    const storageSpaceStats = storageSpaceRes.Datapoints.map((data) => { 
      return data.Sum;
    });
 
    if(storageSpaceStats.length > 0 && storageSpaceStats.every(element => element >= (dbInstance.AllocatedStorage/2))){ 
      this.addScenario(dbInstance.DBInstanceIdentifier, 'shouldScaleDownStorage', {
        value: 'true',
        scaleDown: { 
          action: '', 
          isActionable: false,
          reason: 'This instance has more than half of its allocated storage still available'
        }
      });
    }
  }

  async getCPUUTilization (cloudWatchClient: CloudWatch, dbInstanceIdentifier: string){

    const metricStats = await cloudWatchClient.getMetricStatistics({ 
      Namespace: 'AWS/RDS', 
      MetricName: 'CPUUtilization', 
      StartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      EndTime: new Date(Date.now()), 
      Period: 43200,
      Statistics: ['Maximum'],
      Dimensions: [{ 
        Name: 'DBInstanceIdentifier', 
        Value: dbInstanceIdentifier
      }],
      Unit: 'Percent'
    }); 

    const cpuValues = metricStats.Datapoints.map((data) => { 
      return data.Maximum;
    });

    const maxCPU = Math.max(...cpuValues);

    if(maxCPU < 50){ 
      this.addScenario(dbInstanceIdentifier, 'cpuUtilization', {
        value: maxCPU.toString(), 
        scaleDown: { 
          action: '', 
          isActionable: false,
          reason: 'Max CPU Utilization is under 50%'
        }
      }
      );
    }

  }
}