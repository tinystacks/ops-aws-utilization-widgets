import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { S3 } from '@aws-sdk/client-s3';
import { AlertType } from '../types/types.js';

export type s3UtilizationScenarios = {
  hasIntelligentTiering?: boolean;
  hasLifecyclePolicy?: boolean;
}

export class s3Utilization extends AwsServiceUtilization<s3UtilizationScenarios> {
  
  constructor () {
    super();
  }

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string): Promise<void> {
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
            actions: ['createLifecyclePolicy']
          });
        }
      });
    }
  }

}