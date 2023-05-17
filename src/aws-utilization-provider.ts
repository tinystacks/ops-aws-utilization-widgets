import cached from 'cached';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { BaseProvider } from '@tinystacks/ops-core';
import { Provider } from '@tinystacks/ops-model';
import { AwsResourceType, AwsServiceOverrides, AwsUtilizationOverrides, Utilization } from './types/types.js';
import { AwsServiceUtilization } from './service-utilizations/aws-service-utilization.js';
import { AwsServiceUtilizationFactory } from './service-utilizations/aws-service-utilization-factory.js';

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
  regions?: string[];
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
  regions: string[];

  constructor (props: AwsUtilizationProviderType) {
    super(props);
    const { 
      services,
      regions
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
    this.regions = regions || [ 'us-east-1' ];
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
    overrides?: AwsServiceOverrides
  ): Promise<Utilization<string>> {
    await this.utilizationClasses[service]?.getUtilization(credentialsProvider, this.regions, overrides);
    return this.utilizationClasses[service]?.utilization;
  }

  async doAction (
    service: AwsResourceType,
    credentialsProvider: AwsCredentialsProvider,
    actionName: string,
    resourceId: string,
    region: string
  ) {
    await this.utilizationClasses[service].doAction(credentialsProvider, actionName, resourceId, region);
  }

  async hardRefresh (
    credentialsProvider: AwsCredentialsProvider, overrides: AwsUtilizationOverrides = {}
  ) {
    for (const service of this.services) {
      const serviceOverrides = overrides[service];
      this.utilization[service] = await this.refreshUtilizationData(
        service, credentialsProvider, serviceOverrides
      );
      await cache.set(service, this.utilization[service]);
    }

    return this.utilization;
  }

  async getUtilization (
    credentialsProvider: AwsCredentialsProvider, overrides: AwsUtilizationOverrides = {}
  ) {
    for (const service of this.services) {
      const serviceOverrides = overrides[service];
      if (serviceOverrides?.forceRefesh) {
        this.utilization[service] = await this.refreshUtilizationData(
          service, credentialsProvider, serviceOverrides
        );
        await cache.set(service, this.utilization[service]);
      } else {
        this.utilization[service] = await cache.getOrElse(
          service,
          async () => await this.refreshUtilizationData(service, credentialsProvider, serviceOverrides)
        );
      }
    }

    return this.utilization;
  }
}

export {
  AwsUtilizationProvider
};