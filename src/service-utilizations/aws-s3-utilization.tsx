import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { Bucket, S3 } from '@aws-sdk/client-s3';
import { AwsServiceOverrides } from '../types/types.js';
import { getHourlyCost, listAllRegions, rateLimitMap } from '../utils/utils.js';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import _ from 'lodash';
import { Arns, ONE_GB_IN_BYTES } from '../types/constants.js';

type S3CostData = {
  monthlyCost: number,
  monthlySavings: number
}

export type s3UtilizationScenarios = 'hasIntelligentTiering' | 'hasLifecyclePolicy';

export class s3Utilization extends AwsServiceUtilization<s3UtilizationScenarios> {
  s3Client: S3;
  cwClient: CloudWatch;
  bucketCostData: { [ bucketName: string ]: S3CostData };

  constructor () {
    super();
    this.bucketCostData = {};
  }

  async doAction (awsCredentialsProvider: AwsCredentialsProvider, actionName: string, resourceArn: string) {
    const s3Client = new S3({
      credentials: await awsCredentialsProvider.getCredentials()
    });
    const resourceId = resourceArn.split(':').at(-1);
    if (actionName === 'enableIntelligientTiering') { 
      await this.enableIntelligientTiering(s3Client, resourceId);
    }
  }

  async enableIntelligientTiering (s3Client: S3, bucketName: string, userInput?: any) {
    const configurationId = userInput?.configurationId || `${bucketName}-tiering-configuration`;
   
    return await s3Client.putBucketIntelligentTieringConfiguration({ 
      Bucket: bucketName, 
      Id: configurationId, 
      IntelligentTieringConfiguration: { 
        Id: configurationId,
        Status: 'Enabled',
        Tierings: [
          {
            AccessTier: 'ARCHIVE_ACCESS', 
            Days: 90
          }, 
          {
            AccessTier: 'DEEP_ARCHIVE_ACCESS', 
            Days: 180
          }
        ]
      }
    });
  }

  async getRegionalUtilization (credentials: any, region: string) {
    this.s3Client = new S3({
      credentials,
      region
    });
    this.cwClient = new CloudWatch({
      credentials,
      region
    });

    const allS3Buckets = (await this.s3Client.listBuckets({})).Buckets;

    const analyzeS3Bucket = async (bucket: Bucket) => {
      const bucketName = bucket.Name;
      const bucketArn = Arns.S3(bucketName);
      await this.getLifecyclePolicy(bucketArn, bucketName, region);
      await this.getIntelligentTieringConfiguration(bucketArn, bucketName, region);
      
      // TODO: Change bucketName to bucketArn
      this.addData(bucketArn, 'resourceId', bucketName);
      this.addData(bucketArn, 'region', region);
      if (bucketName in this.bucketCostData) {
        const monthlyCost = this.bucketCostData[bucketName].monthlyCost;
        this.addData(bucketArn, 'monthlyCost', monthlyCost);
        this.addData(bucketArn, 'hourlyCost', getHourlyCost(monthlyCost));
      }
    };

    await rateLimitMap(allS3Buckets, 6, 6, analyzeS3Bucket);
  }

  async getUtilization (
    awsCredentialsProvider: AwsCredentialsProvider, regions: string[],  _overrides?: AwsServiceOverrides
  ): Promise<void> {
    const credentials = await awsCredentialsProvider.getCredentials();
    const usedRegions = regions || await listAllRegions(credentials);
    for (const region of usedRegions) {
      await this.getRegionalUtilization(credentials, region);
    }
    this.getEstimatedMaxMonthlySavings();
  }

  async getIntelligentTieringConfiguration (bucketArn: string, bucketName: string, region: string) {

    const response = await this.s3Client.getBucketLocation({
      Bucket: bucketName
    });

    if (
      response.LocationConstraint === region || (region === 'us-east-1' && response.LocationConstraint === undefined)
    ) {
      const res = await this.s3Client.listBucketIntelligentTieringConfigurations({
        Bucket: bucketName
      });

      if (!res.IntelligentTieringConfigurationList) {
        const { monthlySavings } = await this.setAndGetBucketCostData(bucketName);
        this.addScenario(bucketArn, 'hasIntelligentTiering', {
          value: 'false',
          optimize: { 
            action: 'enableIntelligientTiering', 
            isActionable: true,
            reason: 'Intelligient tiering is not enabled for this bucket',
            monthlySavings
          }
        });
      }
    }
  }

  async getLifecyclePolicy (bucketArn: string, bucketName: string, region: string) {

    const response = await this.s3Client.getBucketLocation({
      Bucket: bucketName
    });

    if (
      response.LocationConstraint === region || (region === 'us-east-1' && response.LocationConstraint === undefined)
    ) {
      await this.s3Client.getBucketLifecycleConfiguration({
        Bucket: bucketName
      }).catch(async (e) => { 
        if(e.Code === 'NoSuchLifecycleConfiguration'){ 
          await this.setAndGetBucketCostData(bucketName);
          this.addScenario(bucketArn, 'hasLifecyclePolicy', {
            value: 'false',
            optimize: { 
              action: '', 
              isActionable: false,
              reason: 'This bucket does not have a lifecycle policy',
              monthlySavings: 0
            }
          });
        }
      });
    }
  }

  async setAndGetBucketCostData (bucketName: string) {
    if (!(bucketName in this.bucketCostData)) {
      const res = await this.cwClient.getMetricData({
        StartTime: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)),
        EndTime: new Date(),
        MetricDataQueries: [
          {
            Id: 'incomingBytes',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/S3',
                MetricName: 'BucketSizeBytes',
                Dimensions: [
                  { 
                    Name: 'BucketName', 
                    Value: bucketName
                  },
                  {
                    Name: 'StorageType',
                    Value: 'StandardStorage'
                  }
                ]
              },
              Period: 30 * 24 * 12 * 300, // 1 month
              Stat: 'Average'
            }
          }
        ]
      });
      
      const bucketBytes = _.get(res, 'MetricDataResults[0].Values[0]', 0);
      
      const monthlyCost = (bucketBytes / ONE_GB_IN_BYTES) * 0.022;

      /* TODO: improve estimate 
      * Based on idea that lower tiers will contain less data
      * Uses arbitrary percentages to separate amount of data in tiers
      */

      let totalBytes = bucketBytes;
      let infrequentlyAccessedBytes = 0.4 * bucketBytes;
      let archiveInstantAccess = 0.4 * infrequentlyAccessedBytes;
      let archiveAccess = 0.4 * archiveInstantAccess;
      const deepArchiveAccess = 0.4 * archiveAccess;

      totalBytes = (totalBytes - infrequentlyAccessedBytes) / ONE_GB_IN_BYTES;
      infrequentlyAccessedBytes = (infrequentlyAccessedBytes - archiveInstantAccess) / ONE_GB_IN_BYTES;
      archiveInstantAccess = (archiveInstantAccess - archiveAccess) / ONE_GB_IN_BYTES;
      archiveAccess = (archiveAccess - deepArchiveAccess) / ONE_GB_IN_BYTES;

      const newMonthlyCost = 
        (totalBytes * 0.022) +
        (infrequentlyAccessedBytes * 0.0125) +
        (archiveInstantAccess * 0.004) +
        (archiveAccess * 0.0036) +
        (deepArchiveAccess * 0.00099);
      
      this.bucketCostData[bucketName] = {
        monthlyCost,
        monthlySavings: monthlyCost - newMonthlyCost
      };
    }

    return this.bucketCostData[bucketName];
  }
  
  findActionFromOverrides (_overrides: AwsServiceOverrides){ 
    if(_overrides.scenarioType === 'hasIntelligentTiering'){ 
      return this.utilization[_overrides.resourceArn].scenarios.hasIntelligentTiering.optimize.action;
    }
    else{ 
      return '';
    }
    
  }
}