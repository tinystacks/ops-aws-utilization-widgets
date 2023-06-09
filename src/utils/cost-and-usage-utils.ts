import { CostAndUsageReportService, ReportDefinition } from '@aws-sdk/client-cost-and-usage-report-service';
import { CostExplorer } from '@aws-sdk/client-cost-explorer';
import { ListObjectsV2CommandOutput, S3 } from '@aws-sdk/client-s3';
import { Dayjs } from 'dayjs';
import isEmpty from 'lodash.isempty';
import { Readable } from 'stream';
import { Arns } from '../types/constants.js';
import { CostReport } from '../types/cost-and-usage-types.js';

export function getArnOrResourceId (awsService: string, resourceId: string, region: string, accountId: string) {
  if (awsService === 'AmazonS3') {
    return Arns.S3(resourceId);
  }

  if (resourceId.startsWith('i-')) {
    return Arns.Ec2(region, accountId, resourceId);
  } else if (resourceId.startsWith('vol-')) {
    return Arns.Ebs(region, accountId, resourceId);
  }

  return resourceId;
}

export async function fillServiceCosts (
  costExplorerClient: CostExplorer, costReport: CostReport, accountId: string, region: string, now: Dayjs
) {
  const res = await costExplorerClient.getCostAndUsage({
    TimePeriod: {
      Start: now.startOf('month').format('YYYY-MM-DD'),
      End: now.format('YYYY-MM-DD')
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    Filter: {
      And: [
        {
          Dimensions: {
            Key: 'LINKED_ACCOUNT',
            Values: [ accountId ]
          }
        },
        {
          Dimensions: {
            Key: 'REGION',
            Values: [ region ]
          }
        }
      ]
    },
    GroupBy: [
      {
        Type: 'DIMENSION',
        Key: 'SERVICE'
      }
    ]
  });

  // subtract 1 because getCostAndUsage has an exclusive End date
  const mtdDays = now.diff(now.startOf('month'), 'days') - 1;
  res.ResultsByTime[0].Groups.forEach((group) => {
    const cost = Number(group.Metrics['UnblendedCost'].Amount) * (30 / mtdDays);
    costReport.report[group.Keys[0]] = {
      serviceCost: cost,
      resourceCosts: {}
    };
  });
}

export async function getReportDefinition (curClient: CostAndUsageReportService): Promise<ReportDefinition> {
  const reportsRes = await curClient.describeReportDefinitions({});
  const reportDefinition = reportsRes.ReportDefinitions.find((def) => {
    return def.AdditionalSchemaElements.includes('RESOURCES'); 
  });

  return reportDefinition;
}

export async function getReadableResourceReportFromS3 (s3Client: S3, bucket: string, prefix: string) {
  let listObjectsRes: ListObjectsV2CommandOutput;
  do {
    listObjectsRes = await s3Client.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: listObjectsRes?.NextContinuationToken
    });
  } while (listObjectsRes?.NextContinuationToken);
  
  if (isEmpty(listObjectsRes?.Contents)) return undefined;

  // ordered by serialized dates so most recent report should be last
  const reportObjects = listObjectsRes.Contents.filter((reportObject) => {
    return reportObject.Key.endsWith('.csv.gz');
  });
  const s3ReportObject = reportObjects.at(-1);
  const key = s3ReportObject.Key;
  const res = await s3Client.getObject({
    Bucket: bucket,
    Key: key
  });
  const costReportZip = res.Body as Readable;

  return costReportZip;
}

export function getServiceForResource (resourceId: string, productName: string) {
  let parsedService = '';
  if (productName === 'Elastic Load Balancing') {
    parsedService = 'Amazon Elastic Load Balancing';
  } else if (resourceId.startsWith('arn')) {
    const parts = resourceId.split(':');
    if (parts[2] === 'ec2') {
      if (parts[5].startsWith('natgateway')) {
        parsedService = 'EC2 - Other';
      } else if (parts[5].startsWith('volume')) {
        parsedService = 'EC2 - Other';
      } else {
        parsedService = 'Amazon Elastic Compute Cloud - Compute';
      }
    }
  }

  return parsedService || productName || 'Other';
}

export function auditCostReport (costReport: CostReport) {
  if ('AWS Secrets Manager' in costReport.report) {
    // 0.40/month secret fee is not included in cost report
    Object.keys(costReport.report['AWS Secrets Manager'].resourceCosts).forEach((resourceId) => {
      costReport.report['AWS Secrets Manager'].resourceCosts[resourceId] += 0.40;
    });
  }

  if ('Amazon Elastic Compute Cloud - Compute' in costReport.report) {
    costReport.report['Amazon Elastic Compute Cloud - Compute'].details = 'Includes IP and data transfer costs';
  }

  if ('AmazonCloudWatch' in costReport.report) {
    costReport.report['AmazonCloudWatch'].details = 
      'Includes CloudWatch metrics costs for resources not displayed here';
  }
}