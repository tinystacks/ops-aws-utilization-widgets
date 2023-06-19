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
const mockGetMetricStatistics = jest.fn();

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

const TEN_GB_IN_BYTES = 10737418240;

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
    mockGetMetricStatistics.mockResolvedValue({ Datapoints: [] });
    mockCloudWatch.mockReturnValue({
      getMetricData: mockGetMetricData,
      getMetricStatistics: mockGetMetricStatistics
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
          hasRetentionPolicy: {
            value: undefined,
            optimize: {
              action: 'setRetentionPolicy',
              isActionable: true,
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
          hourlyCost: 0,
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
          hasRetentionPolicy: {
            value: undefined,
            optimize: {
              action: 'setRetentionPolicy',
              isActionable: true,
              reason: 'this log group does not have a retention policy',
              monthlySavings: 0
            }
          },
          lastEventTime: {
            value: new Date(1680739200000).toLocaleString(),
            optimize: {
              action: '',
              isActionable: false,
              reason: 'this log group has not had an event in over 7 days'
            }
          }
        },
        data: {
          resourceId: 'mock-log-group',
          region: 'us-east-1',
          stack: 'mock-stack',
          hourlyCost: 0,
          monthlyCost: 0,
          maxMonthlySavings: 0
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
          hasRetentionPolicy: {
            value: undefined,
            optimize: {
              action: 'setRetentionPolicy',
              isActionable: true,
              reason: 'this log group does not have a retention policy',
              monthlySavings: 0
            }
          },
          lastEventTime: {
            value: new Date(1678752000000).toLocaleString(),
            delete: {
              action: 'deleteLogGroup',
              isActionable: true,
              reason: 'this log group has not had an event in over 30 days',
              monthlySavings: 0
            }
          }
        },
        data: {
          resourceId: 'mock-log-group',
          region: 'us-east-1',
          stack: 'mock-stack',
          hourlyCost: 0,
          monthlyCost: 0,
          maxMonthlySavings: 0
        }
      });
    });

    it('suggests creating export task if the log group has more than 100 bytes of stored data', async () => {
      mockDescribeLogGroups.mockResolvedValueOnce({
        logGroups: [{
          arn: 'mock-log-group-arn',
          logGroupName: 'mock-log-group',
          retentionInDays: undefined,
          storedBytes: TEN_GB_IN_BYTES
        }]
      });
      mockDescribeLogStreams.mockResolvedValueOnce({
        logStreams: [{
          lastEventTimestamp: Date.now()
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
          hasRetentionPolicy: {
            value: undefined,
            optimize: {
              action: 'setRetentionPolicy',
              isActionable: true,
              reason: 'this log group does not have a retention policy',
              monthlySavings: 0.3
            }
          },
          storedBytes: {
            value: TEN_GB_IN_BYTES.toString(),
            scaleDown: {
              action: 'createExportTask',
              isActionable: false,
              reason: 'this log group has more than 100 MB of stored data',
              monthlySavings: 0.3
            }
          }
        },
        data: {
          resourceId: 'mock-log-group',
          region: 'us-east-1',
          stack: 'mock-stack',
          hourlyCost: (0.3 / 30) / 24,
          monthlyCost: 0.3,
          maxMonthlySavings: 0.3
        }
      });
    });
  });

  describe('doAction', () => {
    describe('setRetentionPolicy', () => {
      it('sets retention policy', async () => {
        mockPutRetentionPolicy.mockResolvedValueOnce({});

        const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
        const provider = {
          getCredentials: mockGetCredentials
        } as unknown as AwsCredentialsProvider;
        await cloudwatchLogsUtilization.doAction(provider, 'setRetentionPolicy', 'arn:mock-log-group:*', 'us-east-1');

        expect(mockPutRetentionPolicy).toBeCalled();
        expect(mockPutRetentionPolicy).toBeCalledWith({
          logGroupName: 'mock-log-group',
          retentionInDays: 90
        });
      });
    });
    
    describe('deleteLogGroup', () => {
      it('deletes log group', async () => {
        mockDeleteLogGroup.mockResolvedValueOnce({});

        const cloudwatchLogsUtilization = new AwsCloudwatchLogsUtilization();
        const provider = {
          getCredentials: mockGetCredentials
        } as unknown as AwsCredentialsProvider;
        await cloudwatchLogsUtilization.doAction(provider, 'deleteLogGroup', 'arn:mock-log-group:*', 'us-east-1');

        expect(mockDeleteLogGroup).toBeCalled();
        expect(mockDeleteLogGroup).toBeCalledWith({
          logGroupName: 'mock-log-group',
        });
      });
    });

    describe('createExportTask', () => {
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
