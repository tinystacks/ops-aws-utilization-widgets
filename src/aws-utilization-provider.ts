import cached from 'cached';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { Provider } from '@tinystacks/ops-core';
import { AwsServiceOverrides, AwsUtilizationOverrides, Utilization } from './types/types.js';
import { AwsServiceUtilization } from './service-utilizations/aws-service-utilization.js';
import { AwsServiceUtilizationFactory } from './service-utilizations/aws-service-utilization-factory.js';
import { AwsResourceType, AwsUtilizationProvider as AwsUtilizationProviderType } from './ops-types.js';

const cache = cached<Utilization<string>>('utilization-cache', {
  backend: {
    type: 'memory'
  }
});

type AwsUtilizationProviderProps = AwsUtilizationProviderType & {
  utilization?: {
    [key: AwsResourceType | string]: Utilization<string>
  };
};

class AwsUtilizationProvider extends Provider {
  static type = 'AwsUtilizationProvider';
  services: AwsResourceType[];
  utilizationClasses: {
    [key: AwsResourceType | string]: AwsServiceUtilization<string>
  };
  utilization: {
    [key: AwsResourceType | string]: Utilization<string>
  };
  regions: string[];

  constructor (props: AwsUtilizationProviderProps) {
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

  static fromJson (props: AwsUtilizationProviderProps) {
    return new AwsUtilizationProvider(props);
  }

  toJson (): AwsUtilizationProviderProps {
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
    try {
      await this.utilizationClasses[service]?.getUtilization(credentialsProvider, this.regions, overrides);
      return this.utilizationClasses[service]?.utilization;
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  async doAction (
    service: AwsResourceType | string,
    credentialsProvider: AwsCredentialsProvider,
    actionName: string,
    resourceArn: string,
    region: string
  ) {
    await this.utilizationClasses[service].doAction(credentialsProvider, actionName, resourceArn, region);
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