import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { EC2 } from '@aws-sdk/client-ec2';
import { AwsServiceOverrides } from '../types/types.js';
import { Volume } from '@aws-sdk/client-ec2';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

export type ebsVolumesUtilizationScenarios = 'hasAttachedInstances' | 'volumeReadWriteOps';

export class ebsVolumesUtilization extends AwsServiceUtilization<ebsVolumesUtilizationScenarios> {
  
  constructor () {
    super();
  }

  async deleteEBSVolume (ec2Client: EC2, volumeId: string){ 
    await ec2Client.deleteVolume({ 
      VolumeId: volumeId
    });
  }

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string,  _overrides?: AwsServiceOverrides): Promise<void> {
    const ec2Client = new EC2({
      credentials: await awsCredentialsProvider.getCredentials(),
      region: region
    });

    if(_overrides){ 
      await this.deleteEBSVolume(ec2Client, _overrides.resourceArn);
    }

    let volumes: Volume[] = [];

    let res = await ec2Client.describeVolumes({}); 
    volumes = [...res.Volumes]; 

    while(res.NextToken){ 
      res = await ec2Client.describeVolumes({
        NextToken: res.NextToken
      }); 
      volumes = [...volumes, ...res.Volumes]; 
    }
    

    this.findUnusedVolumes(volumes);
    const promises: Promise<any>[] = [];
    
    const cloudWatchClient = new CloudWatch({ 
      credentials: await awsCredentialsProvider.getCredentials(), 
      region: region
    }); 

    for (let i = 0; i < volumes.length; ++i) {
      promises.push(this.getReadWriteVolume(cloudWatchClient, volumes[i].VolumeId));
    }

    void await Promise.all(promises).catch(e => console.log(e));

  
  }

  findUnusedVolumes (volumes: Volume[]){ 
    volumes.forEach((volume) => { 
      if(!volume.Attachments || volume.Attachments.length === 0){ 
        this.addScenario(volume.VolumeId, 'hasAttachedInstances', {
          value: 'false',
          delete: { 
            action: 'deleteEBSVolume', 
            reason: 'This EBS volume does not have any attahcments'
          }
        });
      }
    });
  }

  async getReadWriteVolume (cloudWatchClient: CloudWatch, volumeId: string){
    const writeOpsMetricRes = await cloudWatchClient.getMetricStatistics({ 
      Namespace: 'AWS/EBS', 
      MetricName: 'VolumeWriteOps', 
      StartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      EndTime: new Date(Date.now()),
      Period: 43200,
      Statistics: ['Sum'],
      Dimensions: [{ 
        Name: 'VolumeId', 
        Value: volumeId
      }]
    }); 

    const readOpsMetricRes = await cloudWatchClient.getMetricStatistics({
      Namespace: 'AWS/EBS',
      MetricName: 'VolumeReadOps',
      StartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      EndTime: new Date(Date.now()),
      Period: 43200,
      Statistics: ['Sum'],
      Dimensions: [{
        Name: 'VolumeId',
        Value: volumeId
      }]
    });


    const writeMetricStats = writeOpsMetricRes.Datapoints.map((data) => { 
      return data.Sum;
    });

    const readMetricStats = readOpsMetricRes.Datapoints.map((data) => { 
      return data.Sum;
    });

    const allMetricStats =  [...readMetricStats, ...writeMetricStats];

    if(allMetricStats.length === 0 || allMetricStats.every( element => element === 0 )){ 
      this.addScenario(volumeId, 'volumeReadWriteOps', {
        value: '0',
        delete: { 
          action: 'deleteEBSVolume', 
          reason: 'No operations performed on this volume in the last week'
        }
      });
    }
  }

  
}