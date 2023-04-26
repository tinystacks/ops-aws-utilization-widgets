const mockSts = jest.fn();
const mockEc2 = jest.fn();
const mockCloudWatch = jest.fn();
const mockAccount = jest.fn();
const mockCloudFormation = jest.fn();
const mockGetCallerIdentity = jest.fn();
const mockDescribeNatGateways = jest.fn();
const mockDeleteNatGateway = jest.fn();
const mockGetMetricData = jest.fn();
const mockGetCredentials = jest.fn();
const mockListRegions = jest.fn();
const mockDescribeStackResources = jest.fn();

jest.mock('@aws-sdk/client-sts', () => {
  return {
    STS: mockSts
  }
});

jest.mock('@aws-sdk/client-ec2', () => {
  const original = jest.requireActual('@aws-sdk/client-ec2');
  return {
    ...original,
    EC2: mockEc2
  };
});

jest.mock('@aws-sdk/client-cloudwatch', () => {
  const original = jest.requireActual('@aws-sdk/client-cloudwatch');
  const { MetricDataQuery, MetricDataResult } = original;
  return {
    CloudWatch: mockCloudWatch,
    MetricDataQuery,
    MetricDataResult
  };
});

jest.mock('@aws-sdk/client-account', () => {
  const original = jest.requireActual('@aws-sdk/client-account');
  return {
    ...original,
    Account: mockAccount
  };
});

jest.mock('@aws-sdk/client-cloudformation', () => {
  return {
    CloudFormation: mockCloudFormation
  }
});

import { EC2 } from "@aws-sdk/client-ec2";
import { AwsCredentialsProvider } from "@tinystacks/ops-aws-core-widgets";
import { AwsNatGatewayUtilization } from "../../src/service-utilizations/aws-nat-gateway-utilization";
import { Arns } from "../../src/types/constants";

describe('AwsNatGatewayUtilization', () => {
  beforeEach(() => {
    mockSts.mockReturnValue({
      getCallerIdentity: mockGetCallerIdentity
    });
    mockGetCallerIdentity.mockResolvedValue({
      Account: '123456789'
    });
    mockEc2.mockReturnValue({
      describeNatGateways: mockDescribeNatGateways,
      deleteNatGateway: mockDeleteNatGateway
    });
    mockCloudWatch.mockReturnValue({
      getMetricData: mockGetMetricData
    });
    mockAccount.mockReturnValue({
      listRegions: mockListRegions
    });
    mockCloudFormation.mockReturnValue({
      describeStackResources: mockDescribeStackResources
    });
  });

  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });

  describe('getUtilization', () => {
    beforeEach(() => {
      mockListRegions.mockResolvedValue({
        Regions: [{
          RegionName: 'us-east-1'
        }]
      });
      mockDescribeStackResources.mockResolvedValue({
        StackResources: [{
          StackId: 'mock-stack'
        }]
      });
    });
    afterEach(() => {
      // for mocks
      jest.resetAllMocks();
      // for spies
      jest.restoreAllMocks();
    });

    it('suggests deletion if number of active connections is 0', async () => {
      mockDescribeNatGateways.mockResolvedValueOnce({
        NatGateways: [{
          NatGatewayId: 'mock-nat-gateway',
          SubnetId: 'mock-subnet',
          VpcId: 'mock-vpc'
        }]
      });
      mockGetMetricData.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Id: 'activeConnectionCount',
            Values: [0]
          },
          {
            Id: 'bytesInFromDestination',
            Values: [1]
          },
          {
            Id: 'bytesInFromSource',
            Values: [1]
          },
          {
            Id: 'bytesOutToDestination',
            Values: [1]
          },
          {
            Id: 'bytesOutToSource',
            Values: [1]
          }
        ]
      });

      const natGatewayUtilization = new AwsNatGatewayUtilization();
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      await natGatewayUtilization.getUtilization(provider);
      
      expect(mockDescribeNatGateways).toBeCalled();
      expect(mockDescribeNatGateways).toBeCalledWith({});

      expect(mockGetMetricData).toBeCalled();

      const natGatewayArn = Arns.NatGateway('us-east-1', '123456789', 'mock-nat-gateway');
      expect(natGatewayUtilization.utilization).toHaveProperty(natGatewayArn, {
        scenarios: {
          activeConnectionCount: {
            value: '0',
            delete: {
              action: 'deleteNatGateway',
              reason: 'This NAT Gateway has had 0 active connections over the past week. It appears to be unused.'
            }
          }
        },
        data: {
          resourceId: 'mock-nat-gateway',
          region: 'us-east-1',
          stack: 'mock-stack'
        }
      });
    });
    it('suggests deletion if total throughput is 0', async () => {
      mockDescribeNatGateways.mockResolvedValueOnce({
        NatGateways: [{
          NatGatewayId: 'mock-nat-gateway',
          SubnetId: 'mock-subnet',
          VpcId: 'mock-vpc'
        }]
      });
      mockGetMetricData.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Id: 'activeConnectionCount',
            Values: [3]
          },
          {
            Id: 'bytesInFromDestination',
            Values: [0]
          },
          {
            Id: 'bytesInFromSource',
            Values: [0]
          },
          {
            Id: 'bytesOutToDestination',
            Values: [0]
          },
          {
            Id: 'bytesOutToSource',
            Values: [0]
          }
        ]
      });

      const natGatewayUtilization = new AwsNatGatewayUtilization();
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      await natGatewayUtilization.getUtilization(provider);
      
      expect(mockDescribeNatGateways).toBeCalled();
      expect(mockDescribeNatGateways).toBeCalledWith({});

      expect(mockGetMetricData).toBeCalled();

      const natGatewayArn = Arns.NatGateway('us-east-1', '123456789', 'mock-nat-gateway');
      expect(natGatewayUtilization.utilization).toHaveProperty(natGatewayArn, {
        scenarios: {
          totalThroughput: {
            value: '0',
            delete: {
              action: 'deleteNatGateway',
              reason: 'This NAT Gateway has had 0 total throughput over the past week. It appears to be unused.'
            }
          }
        },
        data: {
          resourceId: 'mock-nat-gateway',
          region: 'us-east-1',
          stack: 'mock-stack'
        }
      });
    });
  });

  describe('actions', () => {
    describe('deleteNatGateway', () => {
      it('sets retention policy', async () => {
        mockDeleteNatGateway.mockResolvedValueOnce({});

        const natGatewayUtilization = new AwsNatGatewayUtilization();
        const ec2Client = new EC2({});
        await natGatewayUtilization.deleteNatGateway(ec2Client, 'mock-nat-gateway');

        expect(mockDeleteNatGateway).toBeCalled();
        expect(mockDeleteNatGateway).toBeCalledWith({
          NatGatewayId: 'mock-nat-gateway'
        });
      });
    });
  });
});
