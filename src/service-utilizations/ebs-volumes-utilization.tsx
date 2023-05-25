import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { DescribeVolumesCommandOutput, EC2 } from '@aws-sdk/client-ec2';
import { AwsServiceOverrides } from '../types/types.js';
import { Volume } from '@aws-sdk/client-ec2';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { Arns } from '../types/constants.js';
import { getHourlyCost, rateLimitMap } from '../utils/utils.js';

export type ebsVolumesUtilizationScenarios = 'hasAttachedInstances' | 'volumeReadWriteOps';

export class ebsVolumesUtilization extends AwsServiceUtilization<ebsVolumesUtilizationScenarios> {
  accountId: string;
  volumeCosts: { [ volumeId: string ]: number };

  constructor () {
    super();
    this.volumeCosts = {};
  }

  async doAction (
    awsCredentialsProvider: AwsCredentialsProvider, actionName: string, resourceArn: string, region: string
  ): Promise<void> {
    const resourceId = (resourceArn.split(':').at(-1)).split('/').at(-1);
    if (actionName === 'deleteEBSVolume') {
      const ec2Client = new EC2({
        credentials: await awsCredentialsProvider.getCredentials(),
        region: region
      });
      await this.deleteEBSVolume(ec2Client, resourceId);
    }
  }
  

  async deleteEBSVolume (ec2Client: EC2, volumeId: string){ 
    await ec2Client.deleteVolume({ 
      VolumeId: volumeId
    });
  }

  async getAllVolumes (credentials: any, region: string) {
    const ec2Client = new EC2({
      credentials,
      region
    });
    let volumes: Volume[] = [];
    let describeVolumesRes: DescribeVolumesCommandOutput;
    do {
      describeVolumesRes = await ec2Client.describeVolumes({
        NextToken: describeVolumesRes?.NextToken
      });
      volumes = [ ...volumes, ...describeVolumesRes?.Volumes || [] ];
    } while (describeVolumesRes?.NextToken);

    return volumes;
  }

  getVolumeCost (volume: Volume) {
    if (volume.VolumeId in this.volumeCosts) {
      return this.volumeCosts[volume.VolumeId];
    }

    let cost = 0;
    const storage = volume.Size || 0;
    switch (volume.VolumeType) {
      case 'gp3': {
        const iops = volume.Iops || 0;
        const throughput = volume.Throughput || 0;
        cost = (0.08 * storage) + (0.005 * iops) + (0.040 * throughput);
        break;
      }
      case 'gp2': {
        cost = 0.10 * storage;
        break;
      }
      case 'io2': {
        let iops = volume.Iops || 0;
        let iopsCost = 0;
        if (iops > 64000) {
          const iopsCharged = iops - 640000;
          iopsCost += (0.032 * iopsCharged);
          iops -= iopsCharged;
        }
        if (iops > 32000) {
          const iopsCharged = iops - 320000;
          iopsCost += (0.046 * iopsCharged);
          iops -= iopsCharged;
        }
        iopsCost += (0.065 * iops);
        cost = (0.125 * volume.Size) + iopsCost;
        break;
      }
      case 'io1': {
        cost = (0.125 * storage) + (0.065 * volume.Iops);
        break;
      }
      case 'st1': {
        cost = 0.045 * storage;
        break;
      }
      case 'sc1': {
        cost = 0.015 * storage;
        break;
      }
      default: {
        const iops = volume.Iops || 0;
        const throughput = volume.Throughput || 0;
        cost = (0.08 * storage) + (0.005 * iops) + (0.040 * throughput);
        break;
      }
    }

    this.volumeCosts[volume.VolumeId] = cost;
    return cost;
  }

  async getRegionalUtilization (credentials: any, region: string) {
    const volumes = await this.getAllVolumes(credentials, region);

    const analyzeEbsVolume = async (volume: Volume) => {
      const volumeId = volume.VolumeId;
      const volumeArn = Arns.Ebs(region, this.accountId, volumeId);
      
      const cloudWatchClient = new CloudWatch({ 
        credentials, 
        region
      });

      this.checkForUnusedVolume(volume, volumeArn);
      await this.getReadWriteVolume(cloudWatchClient, volume, volumeArn);

      const monthlyCost = this.volumeCosts[volumeArn] || 0;
      await this.fillData(
        volumeArn,
        credentials,
        region,
        {
          resourceId: volumeId,
          region,
          monthlyCost,
          hourlyCost: getHourlyCost(monthlyCost)
        }
      );

      // this.addData(volumeArn, 'resourceId', volumeId);
      // this.addData(volumeArn, 'region', region);
      // if (volumeArn in this.volumeCosts) {
      //   const monthlyCost = this.volumeCosts[volumeArn];
      //   this.addData(volumeArn, 'monthlyCost', monthlyCost);
      //   this.addData(volumeArn, 'hourlyCost', getHourlyCost(monthlyCost));
      // }
      // await this.identifyCloudformationStack(
      //   credentials, 
      //   region,
      //   volumeArn,
      //   volumeId
      // );
    };
    await rateLimitMap(volumes, 5, 5, analyzeEbsVolume);
  }

  async getUtilization (
    awsCredentialsProvider: AwsCredentialsProvider, regions: string[], _overrides?: AwsServiceOverrides
  ): Promise<void> {
    const credentials = await awsCredentialsProvider.getCredentials();
    for (const region of regions) {
      await this.getRegionalUtilization(credentials, region);
    }
  }

  checkForUnusedVolume (volume: Volume, volumeArn: string) { 
    if(!volume.Attachments || volume.Attachments.length === 0){
      const cost = this.getVolumeCost(volume);
      this.addScenario(volumeArn, 'hasAttachedInstances', {
        value: 'false',
        delete: { 
          action: 'deleteEBSVolume',
          isActionable: true,
          reason: 'This EBS volume does not have any attahcments',
          monthlySavings: cost
        }
      });
    }
  }

  async getReadWriteVolume (cloudWatchClient: CloudWatch, volume: Volume, volumeArn: string){
    const volumeId = volume.VolumeId;
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
      const cost = this.getVolumeCost(volume);
      this.addScenario(volumeArn, 'volumeReadWriteOps', {
        value: '0',
        delete: { 
          action: 'deleteEBSVolume',
          isActionable: true,
          reason: 'No operations performed on this volume in the last week',
          monthlySavings: cost
        }
      });
    }
  }
}