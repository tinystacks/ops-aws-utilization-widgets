import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { AwsServiceOverrides } from '../types/types.js';
import { RDS, DBInstance, DescribeDBInstancesCommandOutput } from '@aws-sdk/client-rds';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { Pricing } from '@aws-sdk/client-pricing';
import get from 'lodash.get';
import { ONE_GB_IN_BYTES } from '../types/constants.js';
import { getHourlyCost } from '../utils/utils.js';

const oneMonthAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

// monthly costs
type StorageAndIOCosts = {
  totalStorageCost: number,
  iopsCost: number,
  throughputCost?: number
};

// monthly costs
type RdsCosts = StorageAndIOCosts & {
  totalCost: number,
  instanceCost: number
}

type RdsMetrics = {
  totalIops: number;
  totalThroughput: number;
  freeStorageSpace: number;
  totalBackupStorageBilled: number;
  cpuUtilization: number;
  databaseConnections: number;
};

export type rdsInstancesUtilizationScenarios = 'hasDatabaseConnections' | 'cpuUtilization' | 'shouldScaleDownStorage' |
                                               'hasAutoScalingEnabled';

const rdsInstanceMetrics = ['DatabaseConnections', 'FreeStorageSpace', 'CPUUtilization'];

export class rdsInstancesUtilization extends AwsServiceUtilization<rdsInstancesUtilizationScenarios> {
  private instanceCosts: { [instanceId: string]: RdsCosts };
  private rdsClient: RDS;
  private cwClient: CloudWatch;
  private pricingClient: Pricing;
  private region: string;
  
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
    this.instanceCosts = {};
  }

  async deleteInstance (rdsClient: RDS, dbInstanceIdentifier: string){ 
    await rdsClient.deleteDBInstance({ 
      DBInstanceIdentifier: dbInstanceIdentifier
    });
  }

  async getRdsInstanceMetrics (dbInstance: DBInstance): Promise<RdsMetrics> {
    const res = await this.cwClient.getMetricData({
      MetricDataQueries: [
        {
          Id: 'readIops',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: 'ReadIOPS',
              Dimensions: [{
                Name: 'DBInstanceIdentifier',
                Value: dbInstance.DBInstanceIdentifier
              }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month
            Stat: 'Average'
          }
        },
        {
          Id: 'writeIops',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: 'WriteIOPS',
              Dimensions: [{
                Name: 'DBInstanceIdentifier',
                Value: dbInstance.DBInstanceIdentifier
              }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month
            Stat: 'Average'
          }
        },
        {
          Id: 'readThroughput',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: 'ReadThroughput',
              Dimensions: [{
                Name: 'DBInstanceIdentifier',
                Value: dbInstance.DBInstanceIdentifier
              }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month
            Stat: 'Average'
          }
        },
        {
          Id: 'writeThroughput',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: 'WriteThroughput',
              Dimensions: [{
                Name: 'DBInstanceIdentifier',
                Value: dbInstance.DBInstanceIdentifier
              }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month
            Stat: 'Average'
          }
        },
        {
          Id: 'freeStorageSpace',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: 'FreeStorageSpace',
              Dimensions: [{
                Name: 'DBInstanceIdentifier',
                Value: dbInstance.DBInstanceIdentifier
              }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month
            Stat: 'Average'
          }
        },
        {
          Id: 'totalBackupStorageBilled',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: 'TotalBackupStorageBilled',
              Dimensions: [{
                Name: 'DBInstanceIdentifier',
                Value: dbInstance.DBInstanceIdentifier
              }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month
            Stat: 'Average'
          }
        },
        {
          Id: 'cpuUtilization',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: 'CPUUtilization',
              Dimensions: [{
                Name: 'DBInstanceIdentifier',
                Value: dbInstance.DBInstanceIdentifier
              }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month,
            Stat: 'Maximum',
            Unit: 'Percent'
          }
        },
        {
          Id: 'databaseConnections',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/RDS',
              MetricName: 'DatabaseConnections',
              Dimensions: [{
                Name: 'DBInstanceIdentifier',
                Value: dbInstance.DBInstanceIdentifier
              }]
            },
            Period: 30 * 24 * 12 * 300, // 1 month,
            Stat: 'Sum'
          }
        }
      ],
      StartTime: oneMonthAgo,
      EndTime: new Date()
    });

    const readIops = get(res, 'MetricDataResults[0].Values[0]', 0);
    const writeIops = get(res, 'MetricDataResults[1].Values[0]', 0);
    const readThroughput = get(res, 'MetricDataResults[2].Values[0]', 0);
    const writeThroughput = get(res, 'MetricDataResults[3].Values[0]', 0);
    const freeStorageSpace = get(res, 'MetricDataResults[4].Values[0]', 0);
    const totalBackupStorageBilled = get(res, 'MetricDataResults[5].Values[0]', 0);
    const cpuUtilization = get(res, 'MetricDataResults[6].Values[6]', 0);
    const databaseConnections = get(res, 'MetricDataResults[7].Values[0]', 0);

    return {
      totalIops: readIops + writeIops,
      totalThroughput: readThroughput + writeThroughput,
      freeStorageSpace,
      totalBackupStorageBilled,
      cpuUtilization,
      databaseConnections
    };
  }

  private getAuroraCosts (
    storageUsedInGB: number, 
    totalBackupStorageBilled: number,
    totalIops: number 
  ): StorageAndIOCosts {
    const storageCost = storageUsedInGB * 0.10;
    const backupStorageCost = (totalBackupStorageBilled / ONE_GB_IN_BYTES) * 0.021;
    const iopsCost = (totalIops / 1000000) * 0.20; // per 1 million requests

    return {
      totalStorageCost: storageCost + backupStorageCost,
      iopsCost
    };
  }

  private getOtherDbCosts (
    dbInstance: DBInstance,
    storageUsedInGB: number,
    totalIops: number,
    totalThroughput: number
  ): StorageAndIOCosts {
    let storageCost = 0;
    let iopsCost = 0;
    let throughputCost = 0;
    if (dbInstance.StorageType === 'gp2') {
      if (dbInstance.MultiAZ) {
        storageCost = storageUsedInGB * 0.23;
      } else {
        storageCost = storageUsedInGB * 0.115;
      }
    } else if (dbInstance.StorageType === 'gp3') {
      if (dbInstance.MultiAZ) {
        storageCost = storageUsedInGB * 0.23;
        iopsCost = totalIops > 3000 ? (totalIops - 3000) * 0.04 : 0;
        // verify throughput metrics are in MB/s
        throughputCost = totalThroughput > 125 ? (totalThroughput - 125) * 0.160 : 0;
      } else {
        storageCost = storageUsedInGB * 0.115;
        iopsCost = totalIops > 3000 ? (totalIops - 3000) * 0.02 : 0;
        // verify throughput metrics are in MB/s
        throughputCost = totalThroughput > 125 ? (totalThroughput - 125) * 0.080 : 0;
      }
    } else {
      if (dbInstance.MultiAZ) {
        storageCost = (dbInstance.AllocatedStorage || 0) * 0.25;
        iopsCost = (dbInstance.Iops || 0) * 0.20;
      } else {
        storageCost = (dbInstance.AllocatedStorage || 0) * 0.125;
        iopsCost = (dbInstance.Iops || 0) * 0.10;
      }
    }

    return {
      totalStorageCost: storageCost,
      iopsCost,
      throughputCost
    };
  }

  private getStorageAndIOCosts (dbInstance: DBInstance, metrics: RdsMetrics) {
    const {
      totalIops,
      totalThroughput,
      freeStorageSpace,
      totalBackupStorageBilled
    } = metrics;
    const dbInstanceClass = dbInstance.DBInstanceClass;
    const storageUsedInGB = 
      dbInstance.AllocatedStorage ? 
        dbInstance.AllocatedStorage - (freeStorageSpace / ONE_GB_IN_BYTES) :
        0;
    if (dbInstanceClass.startsWith('aurora')) {
      return this.getAuroraCosts(storageUsedInGB, totalBackupStorageBilled, totalIops);
    } else {
      // mysql, postgresql, mariadb, oracle, sql server
      return this.getOtherDbCosts(dbInstance, storageUsedInGB, totalIops, totalThroughput);
    }
  }

  /* easier to hard code for now but saving for later
   * volumeName is instance.storageType
   * need to call for Provisioned IOPS and Database Storage
  async getRdsStorageCost () {
    const res = await pricingClient.getProducts({
      ServiceCode: 'AmazonRDS',
      Filters: [
        {
          Type: 'TERM_MATCH',
          Field: 'volumeName',
          Value: 'io1'
        },
        {
          Type: 'TERM_MATCH',
          Field: 'regionCode',
          Value: 'us-east-1'
        },
        {
          Type: 'TERM_MATCH',
          Field: 'deploymentOption',
          Value: 'Single-AZ'
        },
        {
          Type: 'TERM_MATCH',
          Field: 'productFamily',
          Value: 'Provisioned IOPS'
        },
      ]
    });
  }
  */

  // TODO: implement serverless cost?
  // TODO: implement i/o optimized cost?
  async getRdsInstanceCosts (dbInstance: DBInstance, metrics: RdsMetrics) {
    if (dbInstance.DBInstanceIdentifier in this.instanceCosts) {
      return this.instanceCosts[dbInstance.DBInstanceIdentifier];
    }

    let dbEngine = '';
    if (dbInstance.Engine.startsWith('aurora')) {
      if (dbInstance.Engine.endsWith('mysql')) {
        dbEngine = 'Aurora MySQL';
      } else {
        dbEngine = 'Aurora PostgreSQL';
      }
    } else {
      dbEngine = dbInstance.Engine;
    }

    try {
      const res = await this.pricingClient.getProducts({
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
            Value: this.region
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
      const instanceCost = pricePerHour * 24 * 30;

      const { totalStorageCost, iopsCost, throughputCost = 0 } = this.getStorageAndIOCosts(dbInstance, metrics);
      const totalCost = instanceCost + totalStorageCost + iopsCost + throughputCost;
      const rdsCosts = {
        totalCost,
        instanceCost,
        totalStorageCost,
        iopsCost,
        throughputCost
      } as RdsCosts;

      this.instanceCosts[dbInstance.DBInstanceIdentifier] = rdsCosts;
      return rdsCosts;
    } catch (e) {
      return {
        totalCost: 0,
        instanceCost: 0,
        totalStorageCost: 0,
        iopsCost: 0,
        throughputCost: 0
      } as RdsCosts;
    }   
  }

  async getUtilization (
    awsCredentialsProvider: AwsCredentialsProvider, regions: string[],  _overrides?: AwsServiceOverrides
  ): Promise<void> {
    const credentials = await awsCredentialsProvider.getCredentials();
    this.region = regions[0];
    this.rdsClient = new RDS({
      credentials,
      region: this.region
    });
    this.cwClient = new CloudWatch({ 
      credentials, 
      region: this.region
    });
    this.pricingClient = new Pricing({
      credentials,
      region: this.region
    });

    let dbInstances: DBInstance[] = [];
    let describeDBInstancesRes: DescribeDBInstancesCommandOutput;
    do {
      describeDBInstancesRes = await this.rdsClient.describeDBInstances({});
      dbInstances = [ ...dbInstances, ...describeDBInstancesRes.DBInstances ];
    } while (describeDBInstancesRes?.Marker);

    for (const dbInstance of dbInstances) {
      const dbInstanceId = dbInstance.DBInstanceIdentifier;
      const dbInstanceArn = dbInstance.DBInstanceArn || dbInstanceId;
      const metrics = await this.getRdsInstanceMetrics(dbInstance);
      await this.getDatabaseConnections(metrics, dbInstance, dbInstanceArn);
      await this.checkInstanceStorage(metrics, dbInstance, dbInstanceArn);
      await this.getCPUUtilization(metrics, dbInstance, dbInstanceArn);

      const monthlyCost = this.instanceCosts[dbInstanceId]?.totalCost;
      await this.fillData(dbInstanceArn, credentials, this.region, {
        resourceId: dbInstanceId,
        region: this.region,
        monthlyCost,
        hourlyCost: getHourlyCost(monthlyCost)
      });

      rdsInstanceMetrics.forEach(async (metricName) => {  
        await this.getSidePanelMetrics(
          credentials, 
          this.region, 
          dbInstanceId,
          'AWS/RDS', 
          metricName, 
          [{ Name: 'DBInstanceIdentifier', Value: dbInstanceId }]);
      });
    }
  }

  async getDatabaseConnections (metrics: RdsMetrics, dbInstance: DBInstance, dbInstanceArn: string){
    if (!metrics.databaseConnections) {
      const { totalCost } = await this.getRdsInstanceCosts(dbInstance, metrics);
      this.addScenario(dbInstanceArn, 'hasDatabaseConnections', {
        value: 'false',
        delete: { 
          action: 'deleteInstance', 
          isActionable: true,
          reason: 'This instance does not have any db connections',
          monthlySavings: totalCost
        }
      });
    }
  }
  
  async checkInstanceStorage (metrics: RdsMetrics, dbInstance: DBInstance, dbInstanceArn: string) { 

    //if theres a maxallocatedstorage then storage auto-scaling is enabled
    if(!dbInstance.MaxAllocatedStorage){ 
      await this.getRdsInstanceCosts(dbInstance, metrics);
      this.addScenario(dbInstanceArn, 'hasAutoScalingEnabled', {
        value: 'false',
        optimize: { 
          action: '', //didnt find an action for this, need to do it in the console
          isActionable: false,
          reason: 'This instance does not have storage auto-scaling turned on',
          monthlySavings: 0
        }
      });
    }
 
    if (metrics.freeStorageSpace >= (dbInstance.AllocatedStorage / 2)) {
      await this.getRdsInstanceCosts(dbInstance, metrics);
      this.addScenario(dbInstance.DBInstanceIdentifier, 'shouldScaleDownStorage', {
        value: 'true',
        scaleDown: { 
          action: '', 
          isActionable: false,
          reason: 'This instance has more than half of its allocated storage still available',
          monthlySavings: 0
        }
      });
    }
  }

  async getCPUUtilization (metrics: RdsMetrics, dbInstance: DBInstance, dbInstanceArn: string){
    if (metrics.cpuUtilization < 50) {
      await this.getRdsInstanceCosts(dbInstance, metrics);
      this.addScenario(dbInstanceArn, 'cpuUtilization', {
        value: metrics.cpuUtilization.toString(), 
        scaleDown: {
          action: '', 
          isActionable: false,
          reason: 'Max CPU Utilization is under 50%',
          monthlySavings: 0
        }
      });
    }
  }
}