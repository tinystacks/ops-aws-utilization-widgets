import cached from 'cached';
import dayjs from 'dayjs';
import isNil from 'lodash.isnil';
import chunk from 'lodash.chunk';
import stats from 'simple-statistics';
import { DescribeInstanceTypesCommandOutput, DescribeInstancesCommandOutput, EC2, Instance, InstanceTypeInfo, _InstanceType } from '@aws-sdk/client-ec2';
import { AutoScaling } from '@aws-sdk/client-auto-scaling';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import {
  CloudWatch,
  MetricDataQuery,
  MetricDataResult
} from '@aws-sdk/client-cloudwatch';
import { getStabilityStats } from '../utils/stats.js';
import {
  AVG_CPU,
  MAX_CPU,
  DISK_READ_OPS,
  DISK_WRITE_OPS,
  MAX_NETWORK_BYTES_IN,
  MAX_NETWORK_BYTES_OUT,
  AVG_NETWORK_BYTES_IN,
  AVG_NETWORK_BYTES_OUT
} from '../constants.js';

const cache = cached<string>('ec2-util-cache', {
  backend: {
    type: 'memory'
  }
});

type AwsEc2InstanceUtilizationScenarioTypes = 'unused' | 'overAllocated';

type AwsEc2InstanceUtilizationOverrides = {
  instanceIds: string[];
}

export class AwsEc2InstanceUtilization extends AwsServiceUtilization<AwsEc2InstanceUtilizationScenarioTypes> {
  instanceIds: string[];
  instances: Instance[];
  DEBUG_MODE: boolean;

  constructor (enableDebugMode?: boolean) {
    super();
    this.instanceIds = [];
    this.instances = [];
    this.DEBUG_MODE = enableDebugMode || false;
  }

  private async describeAllInstances (ec2Client: EC2, instanceIds?: string[]): Promise<Instance[]> {
    const instances: Instance[] = [];
    let nextToken;
    do {
      const response: DescribeInstancesCommandOutput = await ec2Client.describeInstances({
        InstanceIds: instanceIds,
        NextToken: nextToken
      });
      response?.Reservations.forEach((reservation) => {
        instances.push(...reservation.Instances?.filter(i => !isNil(i.InstanceId)) || []);
      });
      nextToken = response?.NextToken;
    } while (nextToken);

    return instances;
  }

  private getMetricDataQueries (instanceId: string, period: number): MetricDataQuery[] {
    function metricStat (metricName: string, statistic: string) {
      return {
        Metric: {
          Namespace: 'AWS/EC2',
          MetricName: metricName,
          Dimensions: [{
            Name: 'InstanceId',
            Value: instanceId
          }]
        },
        Period: period,
        Stat: statistic
      };
    }
    return [
      {
        Id: AVG_CPU,
        MetricStat: metricStat('CPUUtilization', 'Average')
      },
      {
        Id: MAX_CPU,
        MetricStat: metricStat('CPUUtilization', 'Maximum')
      },
      {
        Id: DISK_READ_OPS,
        MetricStat: metricStat('DiskReadOps', 'Sum')
      },
      {
        Id: DISK_WRITE_OPS,
        MetricStat: metricStat('DiskWriteOps', 'Sum')
      },
      {
        Id: MAX_NETWORK_BYTES_IN,
        MetricStat: metricStat('NetworkIn', 'Maximum')
      },
      {
        Id: MAX_NETWORK_BYTES_OUT,
        MetricStat: metricStat('NetworkOut', 'Maximum')
      },
      {
        Id: AVG_NETWORK_BYTES_IN,
        MetricStat: metricStat('NetworkIn', 'Average')
      },
      {
        Id: AVG_NETWORK_BYTES_OUT,
        MetricStat: metricStat('NetworkOut', 'Average')
      }
    ];
  }

  private async getInstanceTypes (instanceTypeNames: string[], ec2Client: EC2): Promise<InstanceTypeInfo[]> {
    const instanceTypes = [];
    let nextToken;
    do {
      const instanceTypeResponse: DescribeInstanceTypesCommandOutput = await ec2Client.describeInstanceTypes({
        InstanceTypes: instanceTypeNames,
        NextToken: nextToken
      });
      const {
        InstanceTypes = [],
        NextToken
      } = instanceTypeResponse;
      instanceTypes.push(...InstanceTypes);
      nextToken = NextToken;
    } while (nextToken);
    return instanceTypes;
  }

  private async getMetrics (args: {
    instanceId: string;
    startTime: Date;
    endTime: Date; 
    period: number;
    cwClient: CloudWatch;
  }): Promise<{[ key: string ]: MetricDataResult}> {
    const {
      instanceId,
      startTime,
      endTime,
      period,
      cwClient
    } = args;
    const metrics: {[ key: string ]: MetricDataResult} = {};
    let nextToken;
    do {
      const metricDataResponse = await cwClient.getMetricData({
        MetricDataQueries: this.getMetricDataQueries(instanceId, period),
        StartTime: startTime,
        EndTime: endTime
      });
      const {
        MetricDataResults,
        NextToken
      } = metricDataResponse || {};
      MetricDataResults?.forEach((metricData: MetricDataResult) => {
        const {
          Id,
          Timestamps = [],
          Values = []
        } = metricData;
        if (!metrics[Id]) {
          metrics[Id] = metricData;
        } else {
          metrics[Id].Timestamps.push(...Timestamps);
          metrics[Id].Values.push(...Values);
        }
      });
      nextToken = NextToken;
    } while (nextToken);

    return metrics;
  }

  private getInstanceNetworkSetting (networkSetting: string): number | string {
    const numValue = networkSetting.split(' ').find(word => !Number.isNaN(Number(word)));
    if (!isNil(numValue)) return Number(numValue);
    return networkSetting;
  }

  async getRegionalUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string, overrides?: AwsEc2InstanceUtilizationOverrides) {
    const credentials = await awsCredentialsProvider.getCredentials();
    const ec2Client = new EC2({
      credentials,
      region
    });
    const autoScalingClient = new AutoScaling({
      credentials,
      region
    });
    const cwClient = new CloudWatch({
      credentials,
      region
    });

    this.instances = await this.describeAllInstances(ec2Client, overrides?.instanceIds);
    
    const instanceIds = this.instances.map(i => i.InstanceId);
    
    const idPartitions = chunk(instanceIds, 50);
    for (const partition of idPartitions) {
      const { AutoScalingInstances = [] } = await autoScalingClient.describeAutoScalingInstances({
        InstanceIds: partition
      });

      const asgInstances = AutoScalingInstances.map(instance => instance.InstanceId);
      
      this.instanceIds.push(
        ...partition.filter(instanceId => !asgInstances.includes(instanceId))
      );
    }

    this.instances = this.instances.filter(i => this.instanceIds.includes(i.InstanceId));
    
    if (this.instances.length === 0) return;

    const instanceTypeNames = this.instances.map(i => i.InstanceType);
    const instanceTypes = await this.getInstanceTypes(instanceTypeNames, ec2Client);
    const allInstanceTypes = Object.values(_InstanceType);

    for (const instanceId of this.instanceIds) {
      const instance = this.instances.find(i => i.InstanceId === instanceId);
      const instanceType = instanceTypes.find(it => it.InstanceType === instance.InstanceType);
      const instanceFamily = instanceType.InstanceType?.split('.')?.at(0);

      const now = dayjs();
      const startTime = now.subtract(2, 'weeks');
      const fiveMinutes = 5 * 60;
      const metrics = await this.getMetrics({
        instanceId,
        startTime: startTime.toDate(),
        endTime: now.toDate(),
        period: fiveMinutes,
        cwClient
      });

      const {
        [AVG_CPU]: avgCpuMetrics,
        [MAX_CPU]: maxCpuMetrics,
        [DISK_READ_OPS]: diskReadOps,
        [DISK_WRITE_OPS]: diskWriteOps,
        [MAX_NETWORK_BYTES_IN]: maxNetworkBytesIn,
        [MAX_NETWORK_BYTES_OUT]: maxNetworkBytesOut,
        [AVG_NETWORK_BYTES_IN]: avgNetworkBytesIn,
        [AVG_NETWORK_BYTES_OUT]: avgNetworkBytesOut
      } = metrics;

      const { isStable: avgCpuIsStable } = getStabilityStats(avgCpuMetrics.Values);
      
      const {
        max: maxCpu,
        isStable: maxCpuIsStable
      } = getStabilityStats(maxCpuMetrics.Values);

      const lowCpuUtilization = (
        (avgCpuIsStable && maxCpuIsStable) ||
        maxCpu < 10 // Source: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/UsingAlarmActions.html
      );
      
      const allDiskReads = stats.sum(diskReadOps.Values);
      const allDiskWrites = stats.sum(diskWriteOps.Values);
      const totalDiskIops = allDiskReads + allDiskWrites;
      
      const { isStable: networkInIsStable, mean: networkInAvg } = getStabilityStats(avgNetworkBytesIn.Values);
      const { isStable: networkOutIsStable, mean: networkOutAvg } = getStabilityStats(avgNetworkBytesOut.Values);
      
      const avgNetworkThroughputMb = (networkInAvg + networkOutAvg) / (Math.pow(1024, 2));

      const lowNetworkUtilization = (
        (networkInIsStable && networkOutIsStable) || 
        (avgNetworkThroughputMb < 5) // Source: https://www.trendmicro.com/cloudoneconformity/knowledge-base/aws/EC2/idle-instance.html
      );
      
      if (
        lowCpuUtilization &&
        totalDiskIops === 0 &&
        lowNetworkUtilization
      ) {
        this.addScenario(instanceId, 'unused', {
          value: 'unused',
          delete: {
            action: 'terminateInstance',
            reason: 'This EC2 instance appears to be unused based on its CPU utilizaiton, disk IOPS, and network traffic.'
          }
        });
      } else {
        // TODO: For burstable instance types, we need to factor in credit consumption and baseline utilization
        const networkInMax = stats.max(maxNetworkBytesIn.Values);
        const networkOutMax = stats.max(maxNetworkBytesOut.Values);
        const optimiziedVcpuCount = Math.ceil(maxCpu * instanceType.VCpuInfo.DefaultVCpus);
        const minimumNetworkThroughput = Math.ceil((networkInMax + networkOutMax) / (Math.pow(1024, 3)));
        const currentNetworkThroughput = this.getInstanceNetworkSetting(instanceType.NetworkInfo.NetworkPerformance);
        const currentNetworkThroughputIsDefined = typeof currentNetworkThroughput === 'number';

        const instanceTypeNamesInFamily = allInstanceTypes.filter(it => it.startsWith(`${instanceFamily}.`));
        const cachedInstanceTypes = await cache.getOrElse(instanceFamily, async () => JSON.stringify(await this.getInstanceTypes(instanceTypeNamesInFamily, ec2Client)));
        const instanceTypesInFamily = JSON.parse(cachedInstanceTypes || '[]');

        const smallerInstances = instanceTypesInFamily.filter((it: InstanceTypeInfo) => {
          const availableNetworkThroughput = this.getInstanceNetworkSetting(it.NetworkInfo.NetworkPerformance);
          const availableNetworkThroughputIsDefined = typeof availableNetworkThroughput === 'number';
          return (
            it.VCpuInfo.DefaultVCpus >= optimiziedVcpuCount &&
            it.VCpuInfo.DefaultVCpus <= instanceType.VCpuInfo.DefaultVCpus
          ) &&
          (
            (currentNetworkThroughputIsDefined && availableNetworkThroughputIsDefined) ?
              (
                availableNetworkThroughput >= minimumNetworkThroughput &&
                availableNetworkThroughput <= currentNetworkThroughput
              ) :
              // Best we can do for t2 bustable network definitions is find one that is the same because they're not quantifiable
              currentNetworkThroughput === availableNetworkThroughput
          );
        }).sort((a: InstanceTypeInfo, b: InstanceTypeInfo) => {
          const aNetwork = this.getInstanceNetworkSetting(a.NetworkInfo.NetworkPerformance);
          const aNetworkIsNumeric = typeof aNetwork === 'number';
          const bNetwork = this.getInstanceNetworkSetting(b.NetworkInfo.NetworkPerformance);
          const bNetworkIsNumeric = typeof bNetwork === 'number';
          
          const networkScore = (aNetworkIsNumeric && bNetworkIsNumeric) ?
            (aNetwork < bNetwork ? -1 : 1) :
            0;
          const vCpuScore = a.VCpuInfo.DefaultVCpus < b.VCpuInfo.DefaultVCpus ? -1 : 1;
          return networkScore + vCpuScore;
        });

        const targetInstanceType: InstanceTypeInfo | undefined = smallerInstances?.at(0);

        if (targetInstanceType) {
          this.addScenario(instanceId, 'overAllocated', {
            value: 'overAllocated',
            scaleDown: {
              action: 'TODO',
              reason: `This EC2 instance appears to be over allocated based on its CPU and network utilization.  We suggest scaling down to a ${targetInstanceType.InstanceType}`
            }
          });
        }


      }
    }

    console.info('this.utilization:\n', JSON.stringify(this.utilization, null, 2));
  }

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, regions: string[], overrides?: AwsEc2InstanceUtilizationOverrides) {
    for (const region of regions) {
      await this.getRegionalUtilization(awsCredentialsProvider, region, overrides);
    }
  }
}