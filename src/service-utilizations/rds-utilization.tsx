import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { AlertType, Overrides } from '../types/types.js';
import { RDS, DBInstance } from '@aws-sdk/client-rds';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

export type rdsInstancesUtilizationScenarios = {
  hasDatabaseConnections?: boolean;
  CPUUtilization?: number;
  NetworkUtilization?: number;
  shouldDownscaleStorage?: boolean;
  hasAutoScalingEnabled?: boolean;
}


export class rdsInstancesUtilization extends AwsServiceUtilization<rdsInstancesUtilizationScenarios> {
  
  constructor () {
    super();
  }


  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string,  _overrides?: Overrides): Promise<void> {

    const rdsClient = new RDS({
      credentials: await awsCredentialsProvider.getCredentials(),
      region: region
    });

    let res = await rdsClient.describeDBInstances({});

    let dbInstances: DBInstance[] = [];

    dbInstances = [...res.DBInstances]; 

    while(res.Marker){ 
      res = await rdsClient.describeDBInstances({
        Marker: res.Marker 
      }); 
      dbInstances = [...dbInstances, ...res.DBInstances]; 
    }

    /*const cloudWatchClient = new CloudWatch({ 
      credentials: await awsCredentialsProvider.getCredentials(), 
      region: region
    }); */

    //DBInstanceIdentifier

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

    console.log('dbConnectionStats: ', dbConnectionStats);


    if(dbConnectionStats.length === 0 || dbConnectionStats.every( element => element === 0 )){ 
      this.addScenario(dbInstanceIdentifier, 'hasDatabaseConnections', {
        value: false,
        alertType: AlertType.Alarm,
        reason: 'This instance does not have any db connections',
        recommendation: 'deleteInstance',
        actions: ['deleteInstance']
      });
    }
  }
  
  async checkInstanceStorage (cloudWatchClient: CloudWatch, dbInstance: DBInstance){ 

    //if theres a maxallocatedstorage then storage auto-scaling is enabled
    if(!dbInstance.MaxAllocatedStorage){ 
      this.addScenario(dbInstance.DBInstanceIdentifier, 'hasAutoScalingEnabled', {
        value: false,
        alertType: AlertType.Alarm,
        reason: 'This instance does not have storage auto-scaling turned on',
        recommendation: 'Enable Storage Auto-Scaling',
        actions: ['enableAutoScaling']
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
      this.addScenario(dbInstance.DBInstanceIdentifier, 'shouldDownscaleStorage', {
        value: true,
        alertType: AlertType.Alarm,
        reason: 'This instance has more than half of its allocated storage still available',
        recommendation: 'Should downscale storage',
        actions: []
      });
    }
  }


}