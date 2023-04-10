import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { S3 } from '@aws-sdk/client-s3';
import { AlertType, Overrides } from '../types/types.js';

export type s3UtilizationScenarios = {
  hasIntelligentTiering?: boolean;
  hasLifecyclePolicy?: boolean;
}

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

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string,  _overrides?: Overrides): Promise<void> {

    const s3Client = new S3({
      credentials: await awsCredentialsProvider.getCredentials(),
      region: region
    });

    if(_overrides){ 
      const action = this.findActionFromOverrides(_overrides); 
      if(action && action === 'enableIntelligientTiering'){ 
        await this.enableIntelligientTiering(s3Client, _overrides.resourceName, _overrides.userInput);
      }
    }

    const res = await s3Client.listBuckets({});

    const buckets = res.Buckets.map((bucket) => {
      return bucket.Name;
    });


    const promises: Promise<any>[] = [];

    for (let i = 0; i < buckets.length; ++i) {
      promises.push(this.getLifecyclePolicy(s3Client, buckets[i], region));
      promises.push(this.getIntelligentTieringConfiguration(s3Client, buckets[i], region));
    }

    void await Promise.all(promises).catch(e => console.log(e));

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
          value: false,
          alertType: AlertType.Warning,
          reason: 'Intelligient tiering is not enabled for this bucket',
          recommendation: 'enable intelligent tiering',
          actions: ['enableIntelligientTiering']
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
            value: false,
            alertType: AlertType.Warning,
            reason: 'This bucket does not have a lifecycle policy',
            recommendation: 'create a lifecycle policy',
            actions: []
          });
        }
      });
    }
  }
  
  findActionFromOverrides (_overrides: Overrides){ 
    if(_overrides.scenarioType === 'hasIntelligentTiering'){ 
      return this.utilization[_overrides.resourceName].hasIntelligentTiering.actions[0];
    }
    else{ 
      return '';
    }
    
  }
}