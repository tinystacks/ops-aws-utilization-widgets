import cached from 'cached';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { BaseProvider } from '@tinystacks/ops-core';
import { Provider } from '@tinystacks/ops-model';
import {
  AwsResourceType, 
  AwsServiceOverrides, 
  AwsUtilizationOverrides, 
  Utilization 
} from './types/types.js';
import { AwsServiceUtilization } from './service-utilizations/aws-service-utilization.js';
import { AwsServiceUtilizationFactory } from './service-utilizations/aws-service-utilization-factory.js';
import { CostAndUsageReportService } from '@aws-sdk/client-cost-and-usage-report-service';
import { parseStreamSync } from './utils/utils.js';
import { CostReport } from './types/cost-and-usage-types.js';
import { 
  auditCostReport, 
  fillServiceCosts, 
  getArnOrResourceId, 
  getReadableResourceReportFromS3, 
  getReportDefinition, 
  getServiceForResource 
} from './utils/cost-and-usage-utils.js';
import { CostExplorer } from '@aws-sdk/client-cost-explorer';
import { S3 } from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { createUnzip } from 'browserify-zlib';
import dayjs from 'dayjs';

const cache = cached<Utilization<string>>('utilization-cache', {
  backend: {
    type: 'memory'
  }
});

type AwsUtilizationProviderType = Provider & {
  services?: AwsResourceType[];
  utilization?: {
    [key: AwsResourceType | string]: Utilization<string>
  };
  region?: string;
};

class AwsUtilizationProvider extends BaseProvider {
  static type = 'AwsUtilizationProvider';
  services: AwsResourceType[];
  utilizationClasses: {
    [key: AwsResourceType | string]: AwsServiceUtilization<string>
  };
  utilization: {
    [key: AwsResourceType | string]: Utilization<string>
  };
  region: string;

  constructor (props: AwsUtilizationProviderType) {
    super(props);
    const { 
      services
    } = props;

    this.utilizationClasses = {};
    this.utilization = {};
    this.initServices(services || [
      'Account',
      'CloudwatchLogs',
      'Ec2Instance',
      'EcsService',
      'NatGateway',
      'S3Bucket',
      'EbsVolume',
      'RdsInstance'
    ]);
  }

  static fromJson (props: AwsUtilizationProviderType) {
    return new AwsUtilizationProvider(props);
  }

  toJson (): AwsUtilizationProviderType {
    return {
      ...super.toJson(),
      services: this.services,
      utilization: this.utilization
    };
  }

  initServices (services: AwsResourceType[]) {
    this.services = services;
    for (const service of this.services) {
      this.utilizationClasses[service] = AwsServiceUtilizationFactory.createObject(service);
    }
  }

  async refreshUtilizationData (
    service: AwsResourceType, 
    credentialsProvider: AwsCredentialsProvider,
    region: string,
    overrides?: AwsServiceOverrides
  ): Promise<Utilization<string>> {
    try {
      await this.utilizationClasses[service]?.getUtilization(credentialsProvider, [ region ], overrides);
      return this.utilizationClasses[service]?.utilization;
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  async doAction (
    service: AwsResourceType,
    credentialsProvider: AwsCredentialsProvider,
    actionName: string,
    resourceArn: string,
    region: string
  ) {
    await this.utilizationClasses[service].doAction(credentialsProvider, actionName, resourceArn, region);
  }

  async hardRefresh (
    credentialsProvider: AwsCredentialsProvider, region: string, overrides: AwsUtilizationOverrides = {}
  ) {
    for (const service of this.services) {
      const serviceOverrides = overrides[service];
      this.utilization[service] = await this.refreshUtilizationData(
        service, credentialsProvider, region, serviceOverrides
      );
      await cache.set(service, this.utilization[service]);
    }

    return this.utilization;
  }

  async getUtilization (
    credentialsProvider: AwsCredentialsProvider, region: string, overrides: AwsUtilizationOverrides = {}
  ) {
    for (const service of this.services) {
      const serviceOverrides = overrides[service];
      if (serviceOverrides?.forceRefesh) {
        this.utilization[service] = await this.refreshUtilizationData(
          service, credentialsProvider, region, serviceOverrides
        );
        await cache.set(service, this.utilization[service]);
      } else {
        this.utilization[service] = await cache.getOrElse(
          service,
          async () => await this.refreshUtilizationData(service, credentialsProvider, region, serviceOverrides)
        );
      }
    }

    return this.utilization;
  }

  
  // TODO: continue to audit that productName matches service returned by getCostAndUsage
  async getCostReport (awsCredentialsProvider: AwsCredentialsProvider, region: string, accountId: string) {
    const costReport: CostReport = {
      report: {},
      hasCostReportDefinition: false,
      hasCostReport: false
    };
    const credentials = await awsCredentialsProvider.getCredentials();
    const curClient = new CostAndUsageReportService({
      credentials,
      region: 'us-east-1'
    });
    const costExplorerClient = new CostExplorer({
      credentials,
      region
    });

    const now = dayjs();

    await fillServiceCosts(costExplorerClient, costReport, accountId, region, now);
    const costExplorerServices = new Set(Object.keys(costReport.report));

    const reportDefinition = await getReportDefinition(curClient);
    if (!reportDefinition) return costReport;
    else costReport.hasCostReportDefinition = true;

    const {
      S3Region,
      S3Bucket,
      S3Prefix,
      TimeUnit
    } = reportDefinition;

    // init is DAILY
    let toMonthlyFactor = 30;
    if (TimeUnit === 'HOURLY') {
      toMonthlyFactor = 24 * 30;
    } else if (TimeUnit === 'MONTHLY') {
      const mtdDays = now.diff(now.startOf('month'), 'days');
      toMonthlyFactor = 30 / mtdDays;
    }

    const s3Client = new S3({
      credentials,
      region: S3Region
    });
    const resourceReportZip = await getReadableResourceReportFromS3(s3Client, S3Bucket, S3Prefix);
    if (!resourceReportZip) return costReport;
    else costReport.hasCostReport = true;

    const resourceReport = resourceReportZip.pipe(createUnzip());
    await parseStreamSync(resourceReport, { headers: true }, (row) => {
      const resourceId = getArnOrResourceId(
        row['lineItem/ProductCode'],
        row['lineItem/ResourceId'],
        region,
        accountId
      );
      if (
        resourceId && 
        (row['product/region'] === region || row['product/region'] === 'global') && 
        row['lineItem/UsageAccountId'] === accountId
      ) {
        const service = getServiceForResource(resourceId, row['product/ProductName']);
        const cost = 
          row['reservation/EffectiveCost'] ? 
            Number(row['reservation/EffectiveCost']) + Number(row['lineItem/BlendedCost']) : 
            Number(row['lineItem/BlendedCost']);
        const monthlyCostEstimate = cost * toMonthlyFactor;
        if (service in costReport.report) {
          if (resourceId in costReport.report[service].resourceCosts) {
            costReport.report[service].resourceCosts[resourceId] += monthlyCostEstimate;
          } else {
            costReport.report[service].resourceCosts[resourceId] = monthlyCostEstimate;
          }
          if (!costExplorerServices.has(service)) {
            costReport.report[service].serviceCost += monthlyCostEstimate;
          }
        } else {
          costReport.report[service] = {
            serviceCost: 0,
            resourceCosts: {}
          };
        }
      }
    });

    auditCostReport(costReport);

    return costReport;
  }
}

export {
  AwsUtilizationProvider
};