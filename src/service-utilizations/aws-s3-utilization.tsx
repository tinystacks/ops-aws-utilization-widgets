import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { S3 } from '@aws-sdk/client-s3';
import { AwsServiceOverrides } from '../types/types.js';

export type s3UtilizationScenarios = 'hasIntelligentTiering' | 'hasLifecyclePolicy';

export class s3Utilization extends AwsServiceUtilization<s3UtilizationScenarios> {
  
  constructor () {
    super();
  }

  async enableIntelligientTiering (s3Client: S3, bucketName: string, userInput: any){
    const configurationId = userInput.configurationId || `${bucketName}-tiering-configuration`;
   
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

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, regions: string[],  _overrides?: AwsServiceOverrides): Promise<void> {
    const region = regions[0];
    const s3Client = new S3({
      credentials: await awsCredentialsProvider.getCredentials(),
      region: region
    });

    const res = await s3Client.listBuckets({});

    const buckets = res.Buckets.map((bucket) => {
      return bucket.Name;
    });


    const promises: Promise<any>[] = [];

    for (let i = 0; i < buckets.length; ++i) {
      promises.push(this.getLifecyclePolicy(s3Client, buckets[i], region));
      promises.push(this.getIntelligentTieringConfiguration(s3Client, buckets[i], region));
    }

    try{
      void await Promise.all(promises).catch(e => console.log(e));
    } catch(e){ 
      console.error('Error getting utilization for S3', e);
    }

  }

  async getIntelligentTieringConfiguration (s3Client: S3, bucketName: string, region: string) {

    const response = await s3Client.getBucketLocation({
      Bucket: bucketName
    });

    if (response.LocationConstraint === region || (region === 'us-east-1' && response.LocationConstraint === undefined)) {
      const res = await s3Client.listBucketIntelligentTieringConfigurations({
        Bucket: bucketName
      });

      if (!res.IntelligentTieringConfigurationList) {
        this.addScenario(bucketName, 'hasIntelligentTiering', {
          value: 'false',
          optimize: { 
            action: 'enableIntelligientTiering', 
            reason: 'Intelligient tiering is not enabled for this bucket'
          }
        });
      }

    }
  }

  async getLifecyclePolicy (s3Client: S3, bucketName: string, region: string) {

    const response = await s3Client.getBucketLocation({
      Bucket: bucketName
    });

    if (response.LocationConstraint === region || (region === 'us-east-1' && response.LocationConstraint === undefined)) {

      await s3Client.getBucketLifecycleConfiguration({
        Bucket: bucketName
      }).catch((e) => { 
        if(e.Code === 'NoSuchLifecycleConfiguration'){ 
          this.addScenario(bucketName, 'hasLifecyclePolicy', {
            value: 'false',
            optimize: { 
              action: '', 
              reason: 'This bucket does not have a lifecycle policy'
            }
          });
        }
      });
    }
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