import cached from 'cached';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { BaseProvider } from '@tinystacks/ops-core';
import { Provider } from '@tinystacks/ops-model';
import {
  AwsResourceType, 
  AwsServiceOverrides, 
  AwsUtilizationOverrides, 
  CostPerResourceReport, 
  Utilization 
} from './types/types.js';
import { AwsServiceUtilization } from './service-utilizations/aws-service-utilization.js';
import { AwsServiceUtilizationFactory } from './service-utilizations/aws-service-utilization-factory.js';
import { ListObjectsV2CommandOutput, S3 } from '@aws-sdk/client-s3';
import { CostAndUsageReportService, ReportDefinition } from '@aws-sdk/client-cost-and-usage-report-service';
import { createUnzip } from 'zlib';
import { Readable } from 'stream';
import { getArnOrResourceId, parseStreamSync } from './utils/utils.js';
import isEmpty from 'lodash.isempty';
import { STS } from '@aws-sdk/client-sts';

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
    console.log(this.utilization);
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

  // if describeReportDefinitions is empty, we need to tell users to create a report
  // if list objects is empty we need to tell users a report has not been generated yet
  // do we want to show only resources with the accountId associated with the provided credentials?
  async getCostPerResource (awsCredentialsProvider: AwsCredentialsProvider, region: string) {
    const report: CostPerResourceReport = {
      resourceCosts: {},
      hasCostReportDefinition: false,
      hasCostReport: false
    };
    const credentials = await awsCredentialsProvider.getCredentials();
    const costClient = new CostAndUsageReportService({
      credentials,
      region
    });
    const stsClient = new STS({
      credentials,
      region
    });

    const accountId = (await stsClient.getCallerIdentity({})).Account;

    const reportsRes = await costClient.describeReportDefinitions({});
    if (isEmpty(reportsRes.ReportDefinitions)) return report; 
    else report.hasCostReportDefinition = true;
    // prefer monthly report
    let reportDefinition: ReportDefinition;
    reportDefinition = reportsRes.ReportDefinitions.find((def) => {
      return def.AdditionalSchemaElements.includes('RESOURCES') && def.TimeUnit === 'MONTHLY';
    });
    if (!reportDefinition) {
      reportDefinition = reportsRes.ReportDefinitions.find((def) => {
        return def.AdditionalSchemaElements.includes('RESOURCES'); 
      });
    }

    const s3Region = reportDefinition.S3Region;
    const bucket = reportDefinition.S3Bucket;
    const s3Client = new S3({
      credentials,
      region: s3Region
    });
    let listObjectsRes: ListObjectsV2CommandOutput;
    do {
      listObjectsRes = await s3Client.listObjectsV2({
        Bucket: bucket,
        Prefix: reportsRes.ReportDefinitions[0].S3Prefix,
        ContinuationToken: listObjectsRes?.NextContinuationToken
      });
    } while (listObjectsRes?.NextContinuationToken);
   
    if (isEmpty(listObjectsRes?.Contents)) return report;
    else report.hasCostReport = true;

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
    const costReport = costReportZip.pipe(createUnzip());
    /*
     * usage accountId index 9
     * resourceId index 17
     * blended cost index 25
     * region index 104
     */ 
    let factor = 1;
    if (reportDefinition.TimeUnit === 'DAILY') factor = 30;
    else if (reportDefinition.TimeUnit === 'HOURLY') factor = 24 * 30;
    await parseStreamSync(costReport, { headers: true }, (row) => {
      const resourceId = getArnOrResourceId(
        row['lineItem/ProductCode'],
        row['lineItem/ResourceId'],
        region,
        accountId
      );
      const blendedCost = row['lineItem/BlendedCost'];
      if (resourceId && row['product/region'] === region && row['lineItem/UsageAccountId'] === accountId) {
        if (resourceId in report.resourceCosts) {
          report.resourceCosts[resourceId] += (Number(blendedCost) * factor);
        } else {
          report.resourceCosts[resourceId] = (Number(blendedCost) * factor);
        }
      }
    });

    return report;
  }
}

export {
  AwsUtilizationProvider
};