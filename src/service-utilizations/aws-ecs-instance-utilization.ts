import cached from 'cached';
import dayjs from 'dayjs';
import chunk from 'lodash.chunk';
import stats from 'simple-statistics';
import { ContainerInstance, DesiredStatus, ECS, LaunchType, ListClustersCommandOutput, ListServicesCommandOutput, ListTasksCommandOutput, Service, Task } from '@aws-sdk/client-ecs';
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
  MAX_MEMORY,
  AVG_MEMORY,
  ALB_REQUEST_COUNT,
  APIG_REQUEST_COUNT
} from '../constants.js';
import { ElasticLoadBalancingV2 } from '@aws-sdk/client-elastic-load-balancing-v2';
import { Api, ApiGatewayV2, GetApisCommandOutput, Integration } from '@aws-sdk/client-apigatewayv2';
import { DescribeInstanceTypesCommandOutput, EC2, InstanceTypeInfo, _InstanceType } from '@aws-sdk/client-ec2';

const cache = cached<string>('ecs-util-cache', {
  backend: {
    type: 'memory'
  }
});

type AwsEcsInstanceUtilizationScenarioTypes = 'unused' | 'overAllocated';

type EcsService = {
  clusterArn: string;
  serviceArn: string;
}

type ClusterServices = {
  [clusterArn: string]: {
    serviceArns: string[];
  }
}

type FargateScaleRange = {
  min: number;
  max: number;
  increment: number;
};

type FargateScaleOption = {
  [cpu: number]: {
    discrete?: number[];
    range?: FargateScaleRange;
  }
}

type FargateScale = {
  cpu: number,
  memory: number
}

type AwsEcsInstanceUtilizationOverrides = {
  services: EcsService[];
}

export class AwsEcsInstanceUtilization extends AwsServiceUtilization<AwsEcsInstanceUtilizationScenarioTypes> {
  serviceArns: string[];
  services: Service[];
  ecsClient: ECS;
  ec2Client: EC2;
  autoScalingClient: AutoScaling;
  cwClient: CloudWatch;
  elbV2Client: ElasticLoadBalancingV2;
  apigClient: ApiGatewayV2;
  DEBUG_MODE: boolean;

  constructor (enableDebugMode?: boolean) {
    super();
    this.serviceArns = [];
    this.services = [];
    this.DEBUG_MODE = enableDebugMode || false;
  }

  private async listAllClusters (): Promise<string[]> {
    const allClusterArns: string[] = [];
    let nextToken;
    do {
      const response: ListClustersCommandOutput = await this.ecsClient.listClusters({
        nextToken
      });
      const {
        clusterArns = [],
        nextToken: nextClusterToken
      } = response || {};
      allClusterArns.push(...clusterArns);
      nextToken = nextClusterToken;
    } while (nextToken);

    return allClusterArns;
  }
  
  private async listServicesForClusters (clusterArn: string): Promise<ClusterServices> {
    const services: string[] = [];
    let nextToken;
    do {
      const response: ListServicesCommandOutput = await this.ecsClient.listServices({
        cluster: clusterArn,
        nextToken
      });
      const {
        serviceArns = [],
        nextToken: nextServicesToken
      } = response || {};
      services.push(...serviceArns);
      nextToken = nextServicesToken;
    } while (nextToken);

    return {
      [clusterArn]: {
        serviceArns: services
      }
    };
  }

  private async describeAllServices (): Promise<Service[]> {
    const clusterArns = await this.listAllClusters();
    const allServices: EcsService[] = [];

    for (const clusterArn of clusterArns) {
      const servicesForCluster = await this.listServicesForClusters(clusterArn);
      allServices.push(...servicesForCluster[clusterArn].serviceArns.map(s => ({
        clusterArn,
        serviceArn: s
      })));
    }

    return this.describeTheseServices(allServices);
  }

  private async describeTheseServices (ecsServices: EcsService[]): Promise<Service[]> {
    const clusters = ecsServices.reduce<ClusterServices>((acc, ecsService) => {
      acc[ecsService.clusterArn] = acc[ecsService.clusterArn] || {
        serviceArns: [ecsService.serviceArn]
      };
      return acc;
    }, {});
   
    const services: Service[] = [];
    for (const [clusterArn, clusterServices] of Object.entries(clusters)) {
      const serviceChunks = chunk(clusterServices.serviceArns, 10);
      for (const serviceChunk of serviceChunks) {
        const response = await this.ecsClient.describeServices({
          cluster: clusterArn,
          services: serviceChunk
        });
        services.push(...(response?.services || []));
      }
    }

    return services;
  }

  private async getLoadBalacerArnForService (service: Service): Promise<string> {
    const response = await this.elbV2Client.describeTargetGroups({
      TargetGroupArns: [service.loadBalancers?.at(0)?.targetGroupArn]
    });
    return response?.TargetGroups?.at(0)?.LoadBalancerArns?.at(0);
  }

  private async findIntegration (apiId: string, registryArn: string): Promise<Integration | undefined> {
    let nextToken: string;
    let registeredIntegration: Integration;
    do {
      const response = await this.apigClient.getIntegrations({
        ApiId: apiId,
        NextToken: nextToken
      });
      const {
        Items = [],
        NextToken
      } = response || {};

      registeredIntegration = Items.find(i => i.IntegrationUri === registryArn);
      if (!registeredIntegration) {
        nextToken = NextToken;
      }
    } while (nextToken);
    
    return registeredIntegration;
  }

  private async findRegisteredApi (service: Service, apis: Api[]): Promise<Api | undefined> {
    const registryArn = service.serviceRegistries?.at(0)?.registryArn;
    let registeredApi: Api;
    for (const api of apis) {
      const registeredIntegration = await this.findIntegration(api.ApiId, registryArn);
      if (registeredIntegration) {
        registeredApi = api;
        break;
      }
    }
    return registeredApi;
  }
  
  private async getApiIdForService (service: Service): Promise<string> {
    let nextToken: string;
    let registeredApi: Api;
    do {
      const apiResponse: GetApisCommandOutput = await this.apigClient.getApis({ NextToken: nextToken });
      const {
        Items = [],
        NextToken
      } = apiResponse || {};

      registeredApi = await this.findRegisteredApi(service, Items);
      if (!registeredApi) {
        nextToken = NextToken;
      }    
    } while (nextToken);

    return registeredApi.ApiId;
  }

  private async getTask (service: Service): Promise<Task> {
    const taskListResponse = await this.ecsClient.listTasks({
      cluster: service.clusterArn,
      serviceName: service.serviceName,
      maxResults: 1,
      desiredStatus: DesiredStatus.RUNNING
    });

    const {
      taskArns = []
    } = taskListResponse || {};

    const describeTasksResponse = await this.ecsClient.describeTasks({
      cluster: service.clusterArn,
      tasks: [taskArns.at(0)]
    });

    const task = describeTasksResponse?.tasks?.at(0);
    return task;
  }
  
  private async getAllTasks (service: Service): Promise<Task[]> {
    const taskIds = [];
    let nextTaskToken;
    do {
      const taskListResponse: ListTasksCommandOutput = await this.ecsClient.listTasks({
        cluster: service.clusterArn,
        serviceName: service.serviceName,
        desiredStatus: DesiredStatus.RUNNING,
        nextToken: nextTaskToken
      });
  
      const {
        taskArns = [],
        nextToken
      } = taskListResponse || {};
      taskIds.push(...taskArns);
      nextTaskToken = nextToken;
    } while (nextTaskToken);

    const allTasks = [];
    const taskIdPartitions = chunk(taskIds, 100);
    for (const taskIdPartition of taskIdPartitions) {
      const describeTasksResponse = await this.ecsClient.describeTasks({
        cluster: service.clusterArn,
        tasks: taskIdPartition
      });
      const {
        tasks = []
      } = describeTasksResponse;
      allTasks.push(...tasks);
    }

    return allTasks;
  }

  private async getInstanceFamilyForContainerInstance (containerInstance: ContainerInstance): Promise<string> {
    const ec2InstanceResponse = await this.ec2Client.describeInstances({
      InstanceIds: [containerInstance.ec2InstanceId]
    });
    const instanceType = ec2InstanceResponse?.Reservations?.at(0)?.Instances?.at(0)?.InstanceType;
    const instanceFamily = instanceType?.split('.')?.at(0);
    return instanceFamily;
  }

  private async getInstanceTypes (instanceTypeNames: string[]): Promise<InstanceTypeInfo[]> {
    const instanceTypes = [];
    let nextToken;
    do {
      const instanceTypeResponse: DescribeInstanceTypesCommandOutput = await this.ec2Client.describeInstanceTypes({
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

  private getEcsServiceDataQueries (serviceName: string, clusterName: string, period: number): MetricDataQuery[] {
    function metricStat (metricName: string, statistic: string) {
      return {
        Metric: {
          Namespace: 'AWS/ECS',
          MetricName: metricName,
          Dimensions: [
            {
              Name: 'ServiceName',
              Value: serviceName
            },
            {
              Name: 'ClusterName',
              Value: clusterName
            }
          ]
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
        Id: AVG_MEMORY,
        MetricStat: metricStat('MemoryUtilization', 'Average')
      },
      {
        Id: MAX_MEMORY,
        MetricStat: metricStat('MemoryUtilization', 'Maximum')
      }
    ];
  }

  private getAlbRequestCountQuery (loadBalancerArn: string, period: number): MetricDataQuery {
    return {
      Id: ALB_REQUEST_COUNT,
      MetricStat: {
        Metric: {
          Namespace: 'AWS/ApplicationELB',
          MetricName: 'RequestCount',
          Dimensions: [
            {
              Name: 'ServiceName',
              Value: loadBalancerArn
            }
          ]
        },
        Period: period,
        Stat: 'Sum'
      }
    };
  }
  
  private getApigRequestCountQuery (apiId: string, period: number): MetricDataQuery {
    return {
      Id: APIG_REQUEST_COUNT,
      MetricStat: {
        Metric: {
          Namespace: 'AWS/ApiGateway',
          MetricName: 'Count',
          Dimensions: [
            {
              Name: 'ApiId',
              Value: apiId
            }
          ]
        },
        Period: period,
        Stat: 'Sum'
      }
    };
  }

  private async getMetrics (args: {
    service: Service,
    startTime: Date;
    endTime: Date; 
    period: number;
  }): Promise<{[ key: string ]: MetricDataResult}> {
    const {
      service,
      startTime,
      endTime,
      period
    } = args;

    const {
      serviceName,
      clusterArn,
      loadBalancers,
      serviceRegistries
    } = service;

    const clusterName = clusterArn?.split('/').pop();
    
    const queries: MetricDataQuery[] = this.getEcsServiceDataQueries(serviceName, clusterName, period);
    if (loadBalancers && loadBalancers.length > 0) {
      const loadBalancerArn = await this.getLoadBalacerArnForService(service);
      queries.push(this.getAlbRequestCountQuery(loadBalancerArn, period));
    } else if (serviceRegistries && serviceRegistries.length > 0) {
      const apiId = await this.getApiIdForService(service);
      queries.push(this.getApigRequestCountQuery(apiId, period));
    }
    
    const metrics: {[ key: string ]: MetricDataResult} = {};
    let nextToken;
    do {
      const metricDataResponse = await this.cwClient.getMetricData({
        MetricDataQueries: queries,
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

  private createDiscreteValuesForRange (range: FargateScaleRange): number[] {
    const {
      min,
      max,
      increment
    } = range;
    const discreteVales: number[] = [];
    for (let i = min; i <= max; i + increment) {
      discreteVales.push(i);
    }
    return discreteVales;
  }

  private async checkForEc2ScaleDown (service: Service, maxCpuPercentage: number, maxMemoryPercentage: number) {
    const tasks = await this.getAllTasks(service);
    const taskCpu = Number(tasks.at(0)?.cpu);
    const allocatedMemory = Number(tasks.at(0)?.memory);

    let allocatedCpu = taskCpu;
    let containerInstance: ContainerInstance;
    if (!taskCpu) {
      const containerInstanceTaskGroupObject = tasks.reduce<{
        [containerInstanceArn: string]: {
          containerInstanceArn: string;
          tasks: Task[];
        }
      }>((acc, task) => {
        const { containerInstanceArn } = task;
        acc[containerInstanceArn] = acc[containerInstanceArn] || {
          containerInstanceArn,
          tasks: []
        };
        acc[containerInstanceArn].tasks.push(task);
        return acc;
      }, {});
      const containerInstanceTaskGroups  = Object.values(containerInstanceTaskGroupObject);
      containerInstanceTaskGroups.sort((a, b) => {
        if (a.tasks.length > b.tasks.length) {
          return -1;
        } else if (a.tasks.length < b.tasks.length) {
          return 1;
        }
        return 0;
      });
      
      const largestContainerInstance = containerInstanceTaskGroups.at(0);
      const maxTaskCount = largestContainerInstance.tasks.length;

      const containerInstanceResponse = await this.ecsClient.describeContainerInstances({
        cluster: service.clusterArn,
        containerInstances: [largestContainerInstance.containerInstanceArn]
      });

      containerInstance = containerInstanceResponse?.containerInstances?.at(0);

      const containerInstanceCpuResource = containerInstance.registeredResources?.find(r => r.name === 'CPU');
      const containerInstanceCpu = Number(containerInstanceCpuResource?.doubleValue || containerInstanceCpuResource?.integerValue || containerInstanceCpuResource?.longValue);

      allocatedCpu = containerInstanceCpu / maxTaskCount;
    } else {
      const containerInstanceResponse = await this.ecsClient.describeContainerInstances({
        cluster: service.clusterArn,
        containerInstances: [tasks.at(0)?.containerInstanceArn]
      });
      containerInstance = containerInstanceResponse?.containerInstances?.at(0);
    }

    const maxConsumedCpu = maxCpuPercentage * allocatedCpu;
    const maxConsumedMemory = maxMemoryPercentage * allocatedMemory;
    const instanceVcpus = allocatedCpu / 1024;

    let instanceFamily = containerInstance.attributes.find(attr => attr.name === 'ecs.instance-type')?.value?.split('.')?.at(0);
    if (!instanceFamily) {
      instanceFamily = await this.getInstanceFamilyForContainerInstance(containerInstance);
    }
    const allInstanceTypes = Object.values(_InstanceType);
    const instanceTypeNamesInFamily = allInstanceTypes.filter(it => it.startsWith(`${instanceFamily}.`));
    const cachedInstanceTypes = await cache.getOrElse(instanceFamily, async () => JSON.stringify(await this.getInstanceTypes(instanceTypeNamesInFamily)));
    const instanceTypesInFamily = JSON.parse(cachedInstanceTypes || '[]');

    const smallerInstances = instanceTypesInFamily.filter((it: InstanceTypeInfo) => {
      return (
        it.VCpuInfo.DefaultVCpus >= maxConsumedCpu &&
        it.VCpuInfo.DefaultVCpus <= instanceVcpus
      ) &&
      (
        it.MemoryInfo.SizeInMiB >= maxConsumedMemory &&
        it.MemoryInfo.SizeInMiB <= allocatedMemory
      );
    }).sort((a: InstanceTypeInfo, b: InstanceTypeInfo) => {
      const vCpuScore = a.VCpuInfo.DefaultVCpus < b.VCpuInfo.DefaultVCpus ? -1 : 1;
      const memoryScore = a.MemoryInfo.SizeInMiB < b.MemoryInfo.SizeInMiB ? -1 : 1;
      return memoryScore + vCpuScore;
    });

    const targetInstanceType: InstanceTypeInfo | undefined = smallerInstances?.at(0);

    if (targetInstanceType) {
      this.addScenario(service.serviceArn, 'overAllocated', {
        value: 'overAllocated',
        scaleDown: {
          action: 'TODO',
          reason: `The EC2 instances used in this Service's cluster appears to be over allocated based on its CPU and Memory utilization.  We suggest scaling down to a ${targetInstanceType.InstanceType}`
        }
      });
    }
  }

  private async checkForFargateScaleDown (service: Service, maxCpuPercentage: number, maxMemoryPercentage: number) {
    // Source:  https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
    const fargateScaleOptions: FargateScaleOption = {
      256: {
        discrete: [0.5, 1, 2]
      },
      512: {
        range: {
          min: 1,
          max: 4,
          increment: 1
        }
      },
      1024: {
        range: {
          min: 2,
          max: 8,
          increment: 1
        }
      },
      2048: {
        range: {
          min: 4,
          max: 16,
          increment: 1
        }
      },
      4096: {
        range: {
          min: 8,
          max: 30,
          increment: 1
        }
      },
      8192: {
        range: {
          min: 16,
          max: 60,
          increment: 4
        }
      },
      16384: {
        range: {
          min: 32,
          max: 120,
          increment: 4
        }
      }
    };

    const task = await this.getTask(service);
    const allocatedCpu = Number(task?.cpu);
    const allocatedMemory = Number(task?.memory);

    const maxConsumedCpu = maxCpuPercentage * allocatedCpu;
    const maxConsumedMemory = maxMemoryPercentage * allocatedMemory;

    const lowerCpuOptions = Object.keys(fargateScaleOptions).filter(cpu => Number(cpu) < maxConsumedCpu).sort();
    let targetScaleOption: FargateScale;
    for (const cpuOption of lowerCpuOptions) {
      const scalingOption = fargateScaleOptions[Number(cpuOption)];

      const memoryOptionValues = [];
      
      const discreteMemoryOptionValues = scalingOption.discrete || [];
      memoryOptionValues.push(...discreteMemoryOptionValues);
      
      const rangeMemoryOptionsValues = scalingOption.range ? this.createDiscreteValuesForRange(scalingOption.range) : [];
      memoryOptionValues.push(...rangeMemoryOptionsValues);

      const optimizedMemory = memoryOptionValues.filter(mem => (mem > maxConsumedMemory)).sort().at(0);
      if (optimizedMemory) {
        targetScaleOption = {
          cpu: Number(cpuOption),
          memory: (optimizedMemory * 1024)
        };
        break;
      }
    }
    
    if (targetScaleOption) {
      this.addScenario(service.serviceArn, 'overAllocated', {
        value: 'overAllocated',
        scaleDown: {
          action: 'scaleDownFargateService',
          reason: `This ECS service appears to be over allocated based on its CPU, Memory, and network utilization.  We suggest scaling the CPU down to ${targetScaleOption.cpu} and the Memory to ${targetScaleOption.memory} MiB`
        }
      });
    }
  }

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string, overrides?: AwsEcsInstanceUtilizationOverrides) {
    const credentials = await awsCredentialsProvider.getCredentials();
    this.ecsClient = new ECS({
      credentials,
      region
    });
    this.ec2Client = new EC2({
      credentials,
      region
    });
    this.autoScalingClient = new AutoScaling({
      credentials,
      region
    });
    this.cwClient = new CloudWatch({
      credentials,
      region
    });
    this.elbV2Client = new ElasticLoadBalancingV2({
      credentials,
      region
    });
    this.apigClient = new ApiGatewayV2({
      credentials,
      region
    });

    if (overrides?.services) {
      this.services = await this.describeTheseServices(overrides?.services);
    } else {
      this.services = await this.describeAllServices();
    }
    
    if (this.services.length === 0) return;

    for (const service of this.services) {
      const now = dayjs();
      const startTime = now.subtract(2, 'weeks');
      const fiveMinutes = 5 * 60;
      const metrics = await this.getMetrics({
        service,
        startTime: startTime.toDate(),
        endTime: now.toDate(),
        period: fiveMinutes
      });

      const {
        [AVG_CPU]: avgCpuMetrics,
        [MAX_CPU]: maxCpuMetrics,
        [AVG_MEMORY]: avgMemoryMetrics,
        [MAX_MEMORY]: maxMemoryMetrics,
        [ALB_REQUEST_COUNT]: albRequestCountMetrics,
        [APIG_REQUEST_COUNT]: apigRequestCountMetrics
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
      
      const { isStable: avgMemoryIsStable } = getStabilityStats(avgMemoryMetrics.Values);
      
      const {
        max: maxMemory,
        isStable: maxMemoryIsStable
      } = getStabilityStats(maxMemoryMetrics.Values);

      const lowMemoryUtilization = (
        (avgMemoryIsStable && maxMemoryIsStable) ||
        maxMemory < 10
      );
      
      const requestCountMetricValues = [...(albRequestCountMetrics?.Values || []), ...(apigRequestCountMetrics?.Values || [])];
      const totalRequestCount = stats.sum(requestCountMetricValues);

      const noNetworkUtilization = totalRequestCount === 0;
      
      if (
        lowCpuUtilization &&
        lowMemoryUtilization &&
        noNetworkUtilization
      ) {
        this.addScenario(service.serviceArn, 'unused', {
          value: 'unused',
          delete: {
            action: 'deleteService',
            reason: 'This ECS service appears to be unused based on its CPU utilizaiton, Memory utilizaiton, and network traffic.'
          }
        });
      } else if (maxCpu < 0.8 && maxMemory < 0.8) {
        if (service.launchType === LaunchType.FARGATE) {
          await this.checkForFargateScaleDown(service, maxCpu, maxMemory);
        } else {
          await this.checkForEc2ScaleDown(service, maxCpu, maxMemory);
        }
      }
    }

    console.info('this.utilization:\n', JSON.stringify(this.utilization, null, 2));
  }

  async scaleDownFargateService (_serviceArn: string, _cpu: number, _memory: number) {
    return;
  }
}