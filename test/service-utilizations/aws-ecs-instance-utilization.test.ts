
import { MockCache } from "../mocks/MockCache";
jest.useFakeTimers();
jest.setSystemTime(new Date('2023-04-14T00:00:00.000Z'));
const mockGetCredentials = jest.fn();
const mockEcs = jest.fn();
const mockEc2 = jest.fn();
const mockElbV2 = jest.fn();
const mockApiGatewayV2 = jest.fn();
const mockCloudWatch = jest.fn();

// ECS
const mockDescribeServices = jest.fn();
const mockListClusters = jest.fn();
const mockListServices = jest.fn();
const mockListTasks = jest.fn();
const mockDescribeTasks = jest.fn();
const mockDescribeContainerInstances = jest.fn();
const mockDeleteService = jest.fn();
const mockDescribeTaskDefinition = jest.fn();
const mockRegisterTaskDefinition = jest.fn();
const mockUpdateService = jest.fn();

// EC2
const mockDescribeInstances = jest.fn();
const mockDescribeInstanceTypes = jest.fn();

// ElbV2
const mockDescribeTargetGroups = jest.fn();

// CloudWatch
const mockGetMetricData = jest.fn();

// ApiGatewayV2
const mockGetApis = jest.fn();
const mockGetIntegrations = jest.fn();

const mockCache = new MockCache();

jest.mock('cached', () => () => mockCache);

jest.mock('@aws-sdk/client-ecs', () => {
  const original = jest.requireActual('@aws-sdk/client-ecs');
  const {
    ContainerInstance,
    DesiredStatus,
    LaunchType,
    ListClustersCommandOutput,
    ListServicesCommandOutput,
    ListTasksCommandOutput,
    Service,
    Task,
    TaskDefinitionField
  } = original;
  return {
    ECS: mockEcs,
    ContainerInstance,
    DesiredStatus,
    LaunchType,
    ListClustersCommandOutput,
    ListServicesCommandOutput,
    ListTasksCommandOutput,
    Service,
    Task,
    TaskDefinitionField
  };
});
jest.mock('@aws-sdk/client-ec2', () => {
  const original = jest.requireActual('@aws-sdk/client-ec2');
  const { DescribeInstanceTypesCommandOutput, Instance, InstanceTypeInfo, _InstanceType } = original;
  return {
    EC2: mockEc2,
    DescribeInstanceTypesCommandOutput,
    Instance,
    InstanceTypeInfo,
    _InstanceType
  };
});
jest.mock('@aws-sdk/client-apigatewayv2', () => {
  const original = jest.requireActual('@aws-sdk/client-apigatewayv2');
  const {
    Api,
    GetApisCommandOutput,
    Integration
  } = original;
  return {
    ApiGatewayV2: mockApiGatewayV2,
    Api,
    GetApisCommandOutput,
    Integration
  };
});
jest.mock('@aws-sdk/client-elastic-load-balancing-v2', () => ({
  ElasticLoadBalancingV2: mockElbV2
}));
jest.mock('@aws-sdk/client-cloudwatch', () => {
  const original = jest.requireActual('@aws-sdk/client-cloudwatch');
  const { MetricDataQuery, MetricDataResult } = original;
  return {
    CloudWatch: mockCloudWatch,
    MetricDataQuery,
    MetricDataResult
  };
});

import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsEcsInstanceUtilization } from '../../src/service-utilizations/aws-ecs-instance-utilization';
import t2Micro from '../mocks/T2Micro.json';
import t2Nano from '../mocks/T2Nano.json';
import fargateTaskDef from '../mocks/FargateTaskDef.json';
import { ALB_REQUEST_COUNT, APIG_REQUEST_COUNT, AVG_CPU, AVG_MEMORY, AVG_NETWORK_BYTES_IN, AVG_NETWORK_BYTES_OUT, DISK_READ_OPS, DISK_WRITE_OPS, MAX_CPU, MAX_MEMORY, MAX_NETWORK_BYTES_IN, MAX_NETWORK_BYTES_OUT } from "../../src/constants";

describe('AwsEcsInstanceUtilization', () => {
  beforeEach(() => {
    mockEcs.mockReturnValue({
      describeServices: mockDescribeServices,
      listClusters: mockListClusters,
      listServices: mockListServices,
      listTasks: mockListTasks,
      describeTasks: mockDescribeTasks,
      describeContainerInstances: mockDescribeContainerInstances,
      deleteService: mockDeleteService,
      describeTaskDefinition: mockDescribeTaskDefinition,
      registerTaskDefinition: mockRegisterTaskDefinition,
      updateService: mockUpdateService
    });
    mockEc2.mockReturnValue({
      describeInstances: mockDescribeInstances,
      describeInstanceTypes: mockDescribeInstanceTypes
    });
    mockElbV2.mockReturnValue({
      describeTargetGroups: mockDescribeTargetGroups
    })
    mockCloudWatch.mockReturnValue({
      getMetricData: mockGetMetricData
    });
    mockApiGatewayV2.mockReturnValue({
      getApis: mockGetApis,
      getIntegrations: mockGetIntegrations
    })
  });

  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
    mockCache.reset();
    mockCache.restore();
  });

  describe('getRegionalUtilization', () => {
    it('Calls describeServices with cluster name and service arns if provided', async () => {
      mockDescribeServices.mockResolvedValue({
        services: []
      });

      const ecsUtil = new AwsEcsInstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;
      await ecsUtil.getRegionalUtilization(provider, 'us-east-1', {
          services: [
            {
              clusterArn: 'mock-cluster-a',
              serviceArn: 'mock-service-a'
            },
            {
              clusterArn: 'mock-cluster-a',
              serviceArn: 'mock-service-a-2'
            },
            {
              clusterArn: 'mock-cluster-b',
              serviceArn: 'mock-service-b'
            }
          ]
        }
      );


      expect(mockDescribeServices).toBeCalled();
      expect(mockDescribeServices).toBeCalledTimes(2);
      expect(mockDescribeServices).toBeCalledWith({
        cluster: 'mock-cluster-a',
        services: ['mock-service-a', 'mock-service-a-2']
      });
      expect(mockDescribeServices).toBeCalledWith({
        cluster: 'mock-cluster-b',
        services: ['mock-service-b']
      });
    });
    it('lists all services if cluster name and service arns if provided', async () => {
      mockListClusters.mockResolvedValueOnce({
        clusterArns: ['mock-cluster-a'],
        nextToken: 'next-token'
      });
      mockListClusters.mockResolvedValueOnce({
        clusterArns: ['mock-cluster-b']
      });
      mockListServices.mockResolvedValueOnce({
        serviceArns: ['mock-service-a'],
        nextToken: 'next-token'
      });
      mockListServices.mockResolvedValueOnce({
        serviceArns: ['mock-service-a-2']
      });
      mockListServices.mockResolvedValueOnce({
        serviceArns: ['mock-service-b']
      });
      mockDescribeServices.mockResolvedValue({
        services: []
      });

      const ecsUtil = new AwsEcsInstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;
      await ecsUtil.getRegionalUtilization(provider, 'us-east-1');


      expect(mockListClusters).toBeCalled();
      expect(mockListClusters).toBeCalledTimes(2);
      expect(mockListClusters).toBeCalledWith({});
      expect(mockListClusters).toBeCalledWith({ nextToken: 'next-token' });
      
      expect(mockListServices).toBeCalled();
      expect(mockListServices).toBeCalledTimes(3);
      expect(mockListServices).toBeCalledWith({ cluster: 'mock-cluster-a' });
      expect(mockListServices).toBeCalledWith({ cluster: 'mock-cluster-a', nextToken: 'next-token' });
      expect(mockListServices).toBeCalledWith({ cluster: 'mock-cluster-b' });

      expect(mockDescribeServices).toBeCalled();
      expect(mockDescribeServices).toBeCalledTimes(2);
      expect(mockDescribeServices).toBeCalledWith({
        cluster: 'mock-cluster-a',
        services: ['mock-service-a', 'mock-service-a-2']
      });
      expect(mockDescribeServices).toBeCalledWith({
        cluster: 'mock-cluster-b',
        services: ['mock-service-b']
      });
    });
    it('Suggests termination if a service appears to not be used', async () => {
      mockDescribeServices.mockResolvedValue({
        services: [
          {
            serviceArn: 'mock-service',
            serviceName: 'mock-service',
            clusterArn: 'mock-cluster',
            loadBalancers: [
              {
                targetGroupArn: 'mock-target-group'
              }
            ],
            serviceRegistries: []
          }
        ]
      });

      mockDescribeTargetGroups.mockResolvedValue({
        TargetGroups: [
          {
            LoadBalancerArns: ['mock-load-balancer']
          }
        ]
      });

      mockGetMetricData.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Id: AVG_CPU,
            Values: [0.01, 0.02, 0.03]
          },
          {
            Id: MAX_CPU,
            Values: [0.01, 0.02, 0.03]
          },
          {
            Id: AVG_MEMORY,
            Values: [0.01, 0.02, 0.03]
          },
          {
            Id: MAX_MEMORY,
            Values: [0.01, 0.02, 0.03]
          },
          {
            Id: ALB_REQUEST_COUNT,
            Values: [0, 0, 0]
          }
        ]
      });

      const ecsUtil = new AwsEcsInstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;
      await ecsUtil.getRegionalUtilization(provider, 'us-east-1', {
          services: [
            {
              clusterArn: 'mock-cluster',
              serviceArn: 'mock-service'
            }
          ]
        }
      );
      
      expect(mockDescribeServices).toBeCalled();
      expect(mockDescribeServices).toBeCalledTimes(1);
      expect(mockDescribeServices).toBeCalledWith({
        cluster: 'mock-cluster',
        services: ['mock-service']
      });

      expect(mockDescribeTargetGroups).toBeCalled();
      expect(mockDescribeTargetGroups).toBeCalledTimes(1);
      expect(mockDescribeTargetGroups).toBeCalledWith({
        TargetGroupArns: ['mock-target-group']
      });

      expect(mockGetMetricData).toBeCalled();

      expect(ecsUtil.utilization).toHaveProperty('mock-service', {
        data: {},
        scenarios: {
          unused: {
            value: 'unused',
            delete: {
              action: 'deleteService',
              reason: 'This ECS service appears to be unused based on its CPU utilizaiton, Memory utilizaiton, and network traffic.'
            }
          }
        }
      });
    });
    it('Suggests scale down if a fargate service appears to be used but underutilized', async () => {
      mockDescribeServices.mockResolvedValue({
        services: [
          {
            serviceArn: 'mock-service',
            serviceName: 'mock-service',
            clusterArn: 'mock-cluster',
            launchType: 'FARGATE',
            loadBalancers: [],
            serviceRegistries: [
              {
                registryArn: 'mock-registry'
              }
            ]
          }
        ]
      });

      mockGetApis.mockResolvedValue({
        Items: [
          {
            ApiId: 'mock-api'
          }
        ]
      });
      mockGetIntegrations.mockResolvedValue({
        Items: [
          {
            IntegrationUri: 'mock-registry'
          }
        ]
      });

      mockGetMetricData.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Id: AVG_CPU,
            Values: [0.10, 0.12, 0.13]
          },
          {
            Id: MAX_CPU,
            Values: [0.11, 0.22, 0.33]
          },
          {
            Id: AVG_MEMORY,
            Values: [0.10, 0.12, 0.13]
          },
          {
            Id: MAX_MEMORY,
            Values: [0.11, 0.22, 0.33]
          },
          {
            Id: APIG_REQUEST_COUNT,
            Values: [10, 20, 30]
          }
        ]
      });

      mockListTasks.mockResolvedValueOnce({
        taskArns: ['mock-task']
      });
      
      mockDescribeTasks.mockResolvedValueOnce({
        tasks: [
          {
            cpu: 1024,
            memory: 4
          }
        ]
      });

      const ecsUtil = new AwsEcsInstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;
      await ecsUtil.getRegionalUtilization(provider, 'us-east-1', {
          services: [
            {
              clusterArn: 'mock-cluster',
              serviceArn: 'mock-service'
            }
          ]
        }
      );
      
      expect(mockDescribeServices).toBeCalled();
      expect(mockDescribeServices).toBeCalledTimes(1);
      expect(mockDescribeServices).toBeCalledWith({
        cluster: 'mock-cluster',
        services: ['mock-service']
      });

      expect(mockGetApis).toBeCalled();
      expect(mockGetApis).toBeCalledTimes(1);

      expect(mockGetIntegrations).toBeCalled();
      expect(mockGetIntegrations).toBeCalledTimes(1);
      expect(mockGetIntegrations).toBeCalledWith({
        ApiId: 'mock-api'
      });

      expect(mockGetMetricData).toBeCalled();

      expect(ecsUtil.utilization).toHaveProperty('mock-service', {
        data: {},
        scenarios: {
          overAllocated: {
            value: 'overAllocated',
            scaleDown: {
              action: 'scaleDownFargateService',
              reason: 'This ECS service appears to be over allocated based on its CPU, Memory, and network utilization.  We suggest scaling the CPU down to 512 and the Memory to 2048 MiB.'
            }
          }
        }
      });
    });
    it('Suggests scale down if an Ec2 services appears to be used but underutilized', async () => {
      mockDescribeServices.mockResolvedValue({
        services: [
          {
            serviceArn: 'mock-service',
            serviceName: 'mock-service',
            clusterArn: 'mock-cluster',
            loadBalancers: [],
            serviceRegistries: [
              {
                registryArn: 'mock-registry'
              }
            ]
          }
        ]
      });

      mockGetApis.mockResolvedValue({
        Items: [
          {
            ApiId: 'mock-api'
          }
        ]
      });
      mockGetIntegrations.mockResolvedValue({
        Items: [
          {
            IntegrationUri: 'mock-registry'
          }
        ]
      });

      mockGetMetricData.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Id: AVG_CPU,
            Values: [0.01, 0.02, 0.03, 0.10, 0.15]
          },
          {
            Id: MAX_CPU,
            Values: [0.01, 0.02, 0.03, 0.10, 0.15]
          },
          {
            Id: AVG_MEMORY,
            Values: [0.01, 0.02, 0.03, 0.10, 0.15]
          },
          {
            Id: MAX_MEMORY,
            Values: [0.01, 0.02, 0.03, 0.10, 0.15]
          },
          {
            Id: APIG_REQUEST_COUNT,
            Values: [10, 20, 30, 40, 50]
          }
        ]
      });

      mockListTasks.mockResolvedValueOnce({
        taskArns: ['mock-task']
      });
      
      mockDescribeTasks.mockResolvedValueOnce({
        tasks: [
          {
            cpu: '0',
            memory: '4096'
          }
        ]
      });
      
      mockDescribeContainerInstances.mockResolvedValueOnce({
        containerInstances: [
          {
            registeredResources: [
              {
                name: 'CPU',
                integerValue: '1024'
              }
            ],
            attributes: [
              {
                name: 'ecs.instance-type',
                value: 't3.medium'
              }
            ]
          }
        ]
      });
      mockDescribeInstanceTypes.mockResolvedValueOnce({
        InstanceTypes: [
          t2Nano,
          t2Micro
        ]
      });
      mockCache.getOrElse.mockImplementationOnce((_key, refreshFunction) => {
        return refreshFunction();
      });

      const ecsUtil = new AwsEcsInstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;
      await ecsUtil.getRegionalUtilization(provider, 'us-east-1', {
          services: [
            {
              clusterArn: 'mock-cluster',
              serviceArn: 'mock-service'
            }
          ]
        }
      );
      
      expect(mockDescribeServices).toBeCalled();
      expect(mockDescribeServices).toBeCalledTimes(1);
      expect(mockDescribeServices).toBeCalledWith({
        cluster: 'mock-cluster',
        services: ['mock-service']
      });

      expect(mockGetApis).toBeCalled();
      expect(mockGetApis).toBeCalledTimes(1);

      expect(mockGetIntegrations).toBeCalled();
      expect(mockGetIntegrations).toBeCalledTimes(1);
      expect(mockGetIntegrations).toBeCalledWith({
        ApiId: 'mock-api'
      });

      expect(mockGetMetricData).toBeCalled();

      expect(ecsUtil.utilization).toHaveProperty('mock-service', {
        data: {},
        scenarios: {
          overAllocated: {
            value: 'overAllocated',
            scaleDown: {
              action: 'scaleDownEc2Service',
              reason: 'The EC2 instances used in this Service\'s cluster appears to be over allocated based on its CPU and Memory utilization.  We suggest scaling down to a t2.micro.'
            }
          }
        }
      });
    });
  });
  it('deleteService', async () => {
    const ecsUtil = new AwsEcsInstanceUtilization(true);
    const provider = {
      getCredentials: mockGetCredentials
    } as unknown as AwsCredentialsProvider;

    await ecsUtil.deleteService(provider, 'mock-cluster', 'mock-service', 'us-mock-1');

    expect(mockDeleteService).toBeCalled();
    expect(mockDeleteService).toBeCalledWith({
      service: 'mock-service',
      cluster: 'mock-cluster'
    });
  });
  it('scaleDownFargateService', async () => {
    mockDescribeServices.mockResolvedValue({
      services: [
        {
          serviceArn: 'mock-service',
          serviceName: 'mock-service',
          clusterArn: 'mock-cluster',
          taskDefinition: 'mock-task-def',
          launchType: 'FARGATE',
          loadBalancers: [],
          serviceRegistries: [
            {
              registryArn: 'mock-registry'
            }
          ]
        }
      ]
    });
    mockDescribeTaskDefinition.mockResolvedValue(fargateTaskDef)
    mockRegisterTaskDefinition.mockResolvedValue({
      taskDefinition: {
        taskDefinitionArn: 'mock-task-def:2'
      }
    });

    const ecsUtil = new AwsEcsInstanceUtilization(true);
    const provider = {
      getCredentials: mockGetCredentials
    } as unknown as AwsCredentialsProvider;

    await ecsUtil.scaleDownFargateService(provider, 'mock-cluster', 'mock-service', 'us-mock-1', 256, 1024);

    expect(mockDescribeServices).toBeCalled();
    expect(mockDescribeServices).toBeCalledWith({
      services: ['mock-service'],
      cluster: 'mock-cluster'
    });

    expect(mockDescribeTaskDefinition).toBeCalled();
    expect(mockDescribeTaskDefinition).toBeCalledWith({
      taskDefinition: 'mock-task-def',
      include: ['TAGS']
    });

    expect(mockRegisterTaskDefinition).toBeCalled();
    expect(mockRegisterTaskDefinition).toBeCalledWith({
      cpu: '256',
      memory: '1024',
      containerDefinitions: fargateTaskDef.taskDefinition.containerDefinitions,
      family: fargateTaskDef.taskDefinition.family,
      executionRoleArn: fargateTaskDef.taskDefinition.executionRoleArn,
      networkMode: fargateTaskDef.taskDefinition.networkMode,
      placementConstraints: fargateTaskDef.taskDefinition.placementConstraints,
      requiresCompatibilities: fargateTaskDef.taskDefinition.requiresCompatibilities,
      taskRoleArn: fargateTaskDef.taskDefinition.taskRoleArn,
      volumes: fargateTaskDef.taskDefinition.volumes,
      tags: fargateTaskDef.tags
    });

    expect(mockUpdateService).toBeCalled();
    expect(mockUpdateService).toBeCalledWith({
      cluster: 'mock-cluster',
      service: 'mock-service',
      taskDefinition: 'mock-task-def:2',
      forceNewDeployment: true
    });
  });
});