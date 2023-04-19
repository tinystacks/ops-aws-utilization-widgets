/*
import { MockCache } from "../mocks/MockCache";
jest.useFakeTimers();
jest.setSystemTime(new Date('2023-04-14T00:00:00.000Z'));
const mockGetCredentials = jest.fn();
const mockEc2 = jest.fn();
const mockDescribeInstances = jest.fn();
const mockDescribeInstanceTypes = jest.fn();
const mockAutoScaling = jest.fn();
const mockDescribeAutoScalingInstances = jest.fn();
const mockCloudWatch = jest.fn();
const mockGetMetricData = jest.fn();

const mockCache = new MockCache();

jest.mock('cached', () => () => mockCache);

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
jest.mock('@aws-sdk/client-auto-scaling', () => ({
    AutoScaling: mockAutoScaling
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
*/

const mockInstance1 = {
  InstanceId: 'mock-instance-1',
  InstanceType: 't2.micro'
};
const mockInstance2 = {
  InstanceId: 'mock-instance-2',
  InstanceType: 'm5.medium'
};

import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsEcsInstanceUtilization } from '../../src/service-utilizations/aws-ecs-instance-utilization';
import t2Micro from '../mocks/T2Micro.json';
import t2Nano from '../mocks/T2Nano.json';
import { AVG_CPU, AVG_NETWORK_BYTES_IN, AVG_NETWORK_BYTES_OUT, DISK_READ_OPS, DISK_WRITE_OPS, MAX_CPU, MAX_NETWORK_BYTES_IN, MAX_NETWORK_BYTES_OUT } from "../../src/constants";

describe('AwsEc2InstanceUtilization', () => {
  /*
  beforeEach(() => {
    mockEc2.mockReturnValue({
      describeInstances: mockDescribeInstances,
      describeInstanceTypes: mockDescribeInstanceTypes
    });
    mockAutoScaling.mockReturnValue({
      describeAutoScalingInstances: mockDescribeAutoScalingInstances
    });
    mockCloudWatch.mockReturnValue({
      getMetricData: mockGetMetricData
    });
  });

  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
    mockCache.reset();
    mockCache.restore();
  });

  describe('getUtilization', () => {
    it('Calls describeInstances with instanceIds if provided', async () => {
      mockDescribeInstances.mockResolvedValueOnce({
        Reservations: [], // Return empty to short circuit test
        NextToken: 'nextToken'
      });
      mockDescribeInstances.mockResolvedValueOnce({
        Reservations: []
      });
      mockDescribeInstanceTypes.mockResolvedValueOnce({});

      const ec2Util = new AwsEc2InstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;
      await ec2Util.getUtilization(provider, 'us-east-1', { instanceIds: ['mock-instance-1', 'mock-instance-2'] });

      expect(mockDescribeInstances).toBeCalled();
      expect(mockDescribeInstances).toBeCalledTimes(2);
      expect(mockDescribeInstances).toBeCalledWith({
        InstanceIds: ['mock-instance-1', 'mock-instance-2']
      });
      expect(mockDescribeInstances).toBeCalledWith({
        InstanceIds: ['mock-instance-1', 'mock-instance-2'],
        NextToken: 'nextToken'
      });
    });
    it('Filters out instances that are part of an ASG', async () => {
      mockDescribeInstances.mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [mockInstance1]
          },
          {
            Instances: [mockInstance2]
          }
        ]
      });
      mockDescribeAutoScalingInstances.mockResolvedValueOnce({
        AutoScalingInstances: [mockInstance1, mockInstance2] // return both to short circuit test
      });

      const ec2Util = new AwsEc2InstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      await ec2Util.getUtilization(provider, 'us-east-1');
      

      expect(mockDescribeInstances).toBeCalled();
      expect(mockDescribeInstances).toBeCalledWith({});
      
      expect(mockDescribeAutoScalingInstances).toBeCalled();
      expect(mockDescribeAutoScalingInstances).toBeCalledWith({
        InstanceIds: ['mock-instance-1', 'mock-instance-2']
      });
      
      expect(mockDescribeInstanceTypes).not.toBeCalled();
    });
    it('Suggests termination if an instance appears to not be used', async () => {
      mockDescribeInstances.mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [mockInstance1]
          }
        ]
      });
      mockDescribeAutoScalingInstances.mockResolvedValueOnce({
        AutoScalingInstances: []
      });
      mockDescribeInstanceTypes.mockResolvedValueOnce({
        InstanceTypes: [
          t2Micro
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
            Id: DISK_READ_OPS,
            Values: [0, 0, 0]
          },
          {
            Id: DISK_WRITE_OPS,
            Values: [0, 0, 0]
          },
          {
            Id: AVG_NETWORK_BYTES_IN,
            Values: [1500, 1750, 2250]
          },
          {
            Id: AVG_NETWORK_BYTES_OUT,
            Values: [1250, 1500, 1750]
          }
        ]
      });

      const ec2Util = new AwsEc2InstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      try { 
        await ec2Util.getUtilization(provider, 'us-east-1');
      } catch (error) {
        console.error(error);
      }

      expect(mockDescribeInstances).toBeCalled();
      expect(mockDescribeInstances).toBeCalledWith({});
      
      expect(mockDescribeAutoScalingInstances).toBeCalled();
      expect(mockDescribeAutoScalingInstances).toBeCalledWith({
        InstanceIds: ['mock-instance-1']
      });
      
      expect(mockDescribeInstanceTypes).toBeCalled();
      expect(mockDescribeInstanceTypes).toBeCalledTimes(1);
      expect(mockDescribeInstanceTypes).toBeCalledWith({
        InstanceTypes: ['t2.micro']
      });

      expect(mockGetMetricData).toBeCalled();

      expect(ec2Util.utilization).toHaveProperty('mock-instance-1', {
        scenarios: {
          unused: {
            value: 'unused',
            delete: {
              action: 'terminateInstance',
              reason: 'This EC2 instance appears to be unused based on its CPU utilizaiton, disk IOPS, and network traffic.'
            }
          }
        }
      });
    });
    it('Suggests scale down if an instance appears to be used but underutilized', async () => {
      mockDescribeInstances.mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [mockInstance1]
          }
        ]
      });
      mockDescribeAutoScalingInstances.mockResolvedValueOnce({
        AutoScalingInstances: []
      });
      mockDescribeInstanceTypes.mockResolvedValueOnce({
        InstanceTypes: [
          t2Micro
        ]
      });
      mockDescribeInstanceTypes.mockResolvedValueOnce({
        InstanceTypes: [
          t2Nano,
          t2Micro
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
            Id: DISK_READ_OPS,
            Values: [0, 0, 0, 1, 2]
          },
          {
            Id: DISK_WRITE_OPS,
            Values: [0, 0, 0, 1, 2]
          },
          {
            Id: AVG_NETWORK_BYTES_IN,
            Values: [1500, 1750, 2250, (1.45 * Math.pow(10, 6)), (1.6 * Math.pow(10, 6))]
          },
          {
            Id: AVG_NETWORK_BYTES_OUT,
            Values: [1250, 1500, 1750, (4.60 * Math.pow(10, 6)), (5.02 * Math.pow(10, 6))]
          },
          {
            Id: MAX_NETWORK_BYTES_IN,
            Values: [1500, 1750, 2250, (1.45 * Math.pow(10, 6)), (1.6 * Math.pow(10, 6))]
          },
          {
            Id: MAX_NETWORK_BYTES_OUT,
            Values: [1250, 1500, 1750, (4.60 * Math.pow(10, 6)), (5.02 * Math.pow(10, 6))]
          }
        ]
      });

      mockCache.getOrElse.mockImplementationOnce((_key, refreshFunction) => {
        return refreshFunction();
      });

      const ec2Util = new AwsEc2InstanceUtilization(true);
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      await ec2Util.getUtilization(provider, 'us-east-1');

      expect(mockDescribeInstances).toBeCalled();
      expect(mockDescribeInstances).toBeCalledWith({});
      
      expect(mockDescribeAutoScalingInstances).toBeCalled();
      expect(mockDescribeAutoScalingInstances).toBeCalledWith({
        InstanceIds: ['mock-instance-1']
      });
      
      expect(mockDescribeInstanceTypes).toBeCalled();
      expect(mockDescribeInstanceTypes).toBeCalledTimes(2);
      expect(mockDescribeInstanceTypes).toBeCalledWith({
        InstanceTypes: [
          't2.2xlarge',
          't2.large',
          't2.medium',
          't2.micro',
          't2.nano',
          't2.small',
          't2.xlarge'
        ]
      });

      expect(mockGetMetricData).toBeCalled();

      expect(ec2Util.utilization).toHaveProperty('mock-instance-1', {
        scenarios: {
          overAllocated: {
            value: 'overAllocated',
            scaleDown: {
              action: 'TODO',
              reason: `This EC2 instance appears to be over allocated based on its CPU and network utilization.  We suggest scaling down to a t2.nano`
            }
          }
        }
      });
    });
  });
  */
  it('live test', async () => {
    const credentialProvider = new AwsCredentialsProvider({
      id: 'test',
      type: 'LocalAwsProfile',
      credentials: {
        profileName: 'ts'
      }
    });
    const ecsUtilizaiton = new AwsEcsInstanceUtilization();
    await ecsUtilizaiton.getUtilization(credentialProvider, 'us-east-1');
    await ecsUtilizaiton.getUtilization(credentialProvider, 'us-west-2');
  }, 15000);
});