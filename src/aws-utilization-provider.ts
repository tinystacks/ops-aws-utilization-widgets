import cached from 'cached';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { BaseProvider } from '@tinystacks/ops-core';
import { Provider } from '@tinystacks/ops-model';
import {
  AwsResourceType,
  AwsServiceOverrides,
  AwsUtilizationOverrides,
  HistoryEvent,
  Utilization
} from './types/types.js';
import { AwsServiceUtilization } from './service-utilizations/aws-service-utilization.js';
import { AwsServiceUtilizationFactory } from './aws-service-utilization-factory.js';

const utilizationCache = cached<Utilization<string>>('utilization', {
  backend: {
    type: 'memory'
  }
});

const sessionHistoryCache = cached<Array<HistoryEvent>>('session-history', {
  backend: {
    type: 'memory'
  }
});

type AwsUtilizationProviderType = Provider & {
  services?: AwsResourceType[];
  utilization?: {
    [key: AwsResourceType | string]: Utilization<string>
  };
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
    service: AwsResourceType, credentialsProvider: AwsCredentialsProvider, regions: string[],
    overrides?: AwsServiceOverrides
  ): Promise<Utilization<string>> {
    await this.utilizationClasses[service]?.getUtilization(credentialsProvider, regions, overrides);
    return this.utilizationClasses[service]?.utilization;
  }

  async doAction (
    service: AwsResourceType, credentialsProvider: AwsCredentialsProvider, actionName: string, resourceId: string,
    region: string
  ) {
    const event: HistoryEvent = {
      service,
      actionName,
      resourceId,
      region,
      timestamp: new Date().toISOString()
    };
    const history: HistoryEvent[] = await this.getSessionHistory();
    history.push(event);
    await this.utilizationClasses[service].doAction(credentialsProvider, actionName, resourceId, region);
    await sessionHistoryCache.set('history', history);
  }

  async hardRefresh (
    credentialsProvider: AwsCredentialsProvider, regions: string[], overrides: AwsUtilizationOverrides = {}
  ) {
    for (const service of this.services) {
      const serviceOverrides = overrides[service];
      this.utilization[service] = await this.refreshUtilizationData(
        service, credentialsProvider, regions, serviceOverrides
      );
      await utilizationCache.set(service, this.utilization[service]);
    }

    return this.utilization;
  }

  async getUtilization (
    credentialsProvider: AwsCredentialsProvider, regions: string[], overrides: AwsUtilizationOverrides = {}
  ) {
    for (const service of this.services) {
      const serviceOverrides = overrides[service];
      if (serviceOverrides?.forceRefesh) {
        this.utilization[service] = await this.refreshUtilizationData(
          service, credentialsProvider, regions, serviceOverrides
        );
        await utilizationCache.set(service, this.utilization[service]);
      } else {
        this.utilization[service] = await utilizationCache.getOrElse(
          service,
          async () => await this.refreshUtilizationData(service, credentialsProvider, regions, serviceOverrides)
        );
      }
    }

    return this.utilization;
  }

  async getSessionHistory (): Promise<HistoryEvent[]> {
    return sessionHistoryCache.getOrElse('history', []);
  }
}

export {
  AwsUtilizationProvider
};