jest.useFakeTimers();
jest.setSystemTime(new Date('2023-04-14T00:00:00.000Z'));

const mockCloudWatchLogs = jest.fn();
const mockDescribeLogGroups = jest.fn();
const mockDescribeLogStreams = jest.fn();
const mockGetCredentials = jest.fn();
const mockPutRetentionPolicy = jest.fn();
const mockDeleteLogGroup = jest.fn();
const mockCreateExportTask = jest.fn();
const mockAccount = jest.fn();
const mockListRegions = jest.fn();
const mockCloudFormation = jest.fn();
const mockDescribeStackResources = jest.fn();
const mockCloudWatch = jest.fn();
const mockGetMetricData = jest.fn();

jest.mock('@aws-sdk/client-cloudwatch-logs', () => {
  const original = jest.requireActual('@aws-sdk/client-cloudwatch-logs');
  return {
    ...original,
    CloudWatchLogs: mockCloudWatchLogs
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

jest.mock('@aws-sdk/client-cloudwatch', () => {
  return {
    CloudWatch: mockCloudWatch
  }
});

const TWO_GB_IN_BYTES = 2147483648;
const ONE_HUNDRED_MB_IN_BYTES = 104857600;

import { CloudWatchLogs } from "@aws-sdk/client-cloudwatch-logs";
import { AwsCredentialsProvider } from "@tinystacks/ops-aws-core-widgets";
import { AwsCloudwatchLogsUtilization } from "../../src/service-utilizations/aws-cloudwatch-logs-utilization";

describe('AwsCloudwatchLogsUtilization', () => {
  beforeEach(() => {
    mockCloudWatchLogs.mockReturnValue({
      describeLogGroups: mockDescribeLogGroups,
      describeLogStreams: mockDescribeLogStreams,
      putRetentionPolicy: mockPutRetentionPolicy,
      deleteLogGroup: mockDeleteLogGroup,
      createExportTask: mockCreateExportTask
    });
    mockAccount.mockReturnValue({
      listRegions: mockListRegions
    });
    mockCloudFormation.mockReturnValue({
      describeStackResources: mockDescribeStackResources
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

    it('suggests adding a retention policy if one does not exist', async () => {
      mockDescribeLogGroups.mockResolvedValueOnce({
        logGroups: [{
          arn: 'mock-log-group-arn',
          logGroupName: '/aws/mock-service/mock-resource',
          retentionInDays: undefined
        }]
      });
      mockDescribeLogStreams.mockResolvedValueOnce({
        logStreams: [{
          lastEventTimestamp: new Date()
        }]
      });
      mockGetMetricData.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Values: [ ONE_HUNDRED_MB_IN_BYTES, 20 ]
          }
        ]
      });
      
      const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      await cloudwatchLogsUtilization.getUtilization(provider);

      expect(mockDescribeLogGroups).toBeCalled();
      expect(mockDescribeLogGroups).toBeCalledWith({
        NextToken: undefined
      });

      expect(mockDescribeLogStreams).toBeCalled();
      expect(mockDescribeLogStreams).toBeCalledTimes(1);

      expect(cloudwatchLogsUtilization.utilization).toHaveProperty('mock-log-group-arn', {
        scenarios: {
          retentionInDays: {
            value: undefined,
            optimize: {
              action: 'setRetentionPolicy',
              reason: 'this log group does not have a retention policy',
              monthlySavings: 0
            }
          }
        },
        data: {
          resourceId: '/aws/mock-service/mock-resource',
          region: 'us-east-1',
          associatedResourceId: 'mock-resource',
          stack: 'mock-stack',
          monthlyCost: 0,
          maxMonthlySavings: 0
        }
      });
    });

    it('suggests optimizing log group if the log group has not had an event in the past 7 days', async () => {
      mockDescribeLogGroups.mockResolvedValueOnce({
        logGroups: [{
          arn: 'mock-log-group-arn',
          logGroupName: 'mock-log-group',
          retentionInDays: undefined
        }]
      });
      mockDescribeLogStreams.mockResolvedValueOnce({
        logStreams: [{
          lastEventTimestamp: Date.now() - (8 * 24 * 60 * 60 * 1000)
        }]
      });
      mockGetMetricData.mockResolvedValueOnce({
        MetricDataResults: [
          {
            Values: [ 0 ]
          }
        ]
      });
      
      const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      await cloudwatchLogsUtilization.getUtilization(provider);

      expect(mockDescribeLogGroups).toBeCalled();
      expect(mockDescribeLogGroups).toBeCalledWith({
        NextToken: undefined
      });

      expect(mockDescribeLogStreams).toBeCalled();
      expect(mockDescribeLogStreams).toBeCalledTimes(1);

      expect(cloudwatchLogsUtilization.utilization).toHaveProperty('mock-log-group-arn', {
        scenarios: {
          retentionInDays: {
            value: undefined,
            optimize: {
              action: 'setRetentionPolicy',
              reason: 'this log group does not have a retention policy'
            }
          },
          lastEventTime: {
            value: '1680739200000',
            optimize: {
              action: '',
              reason: 'this log group has not had an event in over 7 days'
            }
          }
        },
        data: {
          resourceId: 'mock-log-group',
          region: 'us-east-1',
          stack: 'mock-stack'
        }
      });
    });

    it('suggests deleting log group if the log group has not had an event in the past 30 days', async () => {
      mockDescribeLogGroups.mockResolvedValueOnce({
        logGroups: [{
          arn: 'mock-log-group-arn',
          logGroupName: 'mock-log-group',
          retentionInDays: undefined
        }]
      });
      mockDescribeLogStreams.mockResolvedValueOnce({
        logStreams: [{
          lastEventTimestamp: Date.now() - (31 * 24 * 60 * 60 * 1000)
        }]
      });
      
      const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      await cloudwatchLogsUtilization.getUtilization(provider);

      expect(mockDescribeLogGroups).toBeCalled();
      expect(mockDescribeLogGroups).toBeCalledWith({
        NextToken: undefined
      });

      expect(mockDescribeLogStreams).toBeCalled();
      expect(mockDescribeLogStreams).toBeCalledTimes(1);

      expect(cloudwatchLogsUtilization.utilization).toHaveProperty('mock-log-group-arn', {
        scenarios: {
          retentionInDays: {
            value: undefined,
            optimize: {
              action: 'setRetentionPolicy',
              reason: 'this log group does not have a retention policy'
            }
          },
          lastEventTime: {
            value: '1678752000000',
            delete: {
              action: 'deleteLogGroup',
              reason: 'this log group has not had an event in over 30 days'
            }
          }
        },
        data: {
          resourceId: 'mock-log-group',
          region: 'us-east-1',
          stack: 'mock-stack'
        }
      });
    });

    it('suggests creating export task if the log group has more than 100 bytes of stored data', async () => {
      mockDescribeLogGroups.mockResolvedValueOnce({
        logGroups: [{
          arn: 'mock-log-group-arn',
          logGroupName: 'mock-log-group',
          retentionInDays: undefined,
          storedBytes: 101
        }]
      });
      mockDescribeLogStreams.mockResolvedValueOnce({
        logStreams: [{
          lastEventTimestamp: Date.now()
        }]
      });
      
      const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
      const provider = {
        getCredentials: mockGetCredentials
      } as unknown as AwsCredentialsProvider;

      await cloudwatchLogsUtilization.getUtilization(provider);

      expect(mockDescribeLogGroups).toBeCalled();
      expect(mockDescribeLogGroups).toBeCalledWith({
        NextToken: undefined
      });

      expect(mockDescribeLogStreams).toBeCalled();
      expect(mockDescribeLogStreams).toBeCalledTimes(1);

      expect(cloudwatchLogsUtilization.utilization).toHaveProperty('mock-log-group-arn', {
        scenarios: {
          retentionInDays: {
            value: undefined,
            optimize: {
              action: 'setRetentionPolicy',
              reason: 'this log group does not have a retention policy'
            }
          },
          storedBytes: {
            value: '101',
            scaleDown: {
              action: 'createExportTask',
              reason: 'this log group has more than 100 bytes of stored data'
            }
          }
        },
        data: {
          resourceId: 'mock-log-group',
          region: 'us-east-1',
          stack: 'mock-stack'
        }
      });
    });
  });

  describe('actions', () => {
    describe('setRetentionPolicy', () => {
      it('sets retention policy', async () => {
        mockPutRetentionPolicy.mockResolvedValueOnce({});

        const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
        const cloudwatchLogsClient = new CloudWatchLogs({});
        await cloudwatchLogsUtilization.setRetentionPolicy(cloudwatchLogsClient, 'mock-log-group', 30);

        expect(mockPutRetentionPolicy).toBeCalled();
        expect(mockPutRetentionPolicy).toBeCalledWith({
          logGroupName: 'mock-log-group',
          retentionInDays: 30
        });
      });

      it('deletes log group', async () => {
        mockDeleteLogGroup.mockResolvedValueOnce({});

        const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
        const cloudwatchLogsClient = new CloudWatchLogs({});
        await cloudwatchLogsUtilization.deleteLogGroup(cloudwatchLogsClient, 'mock-log-group');

        expect(mockDeleteLogGroup).toBeCalled();
        expect(mockDeleteLogGroup).toBeCalledWith({
          logGroupName: 'mock-log-group',
        });
      });

      it('creates export task', async () => {
        mockCreateExportTask.mockResolvedValueOnce({});

        const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
        const cloudwatchLogsClient = new CloudWatchLogs({});
        await cloudwatchLogsUtilization.createExportTask(cloudwatchLogsClient, 'mock-log-group', 'mock-bucket');

        expect(mockCreateExportTask).toBeCalled();
        expect(mockCreateExportTask).toBeCalledWith({
          logGroupName: 'mock-log-group',
          destination: 'mock-bucket',
          from: 0,
          to: Date.now()
        });
      });
    });
  });
});
