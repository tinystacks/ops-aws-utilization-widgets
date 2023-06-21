import cached from 'cached';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { BaseProvider } from '@tinystacks/ops-core';
import {
  ActionType,
  AwsResourceType,
  AwsServiceOverrides,
  AwsUtilizationOverrides,
  HistoryEvent,
  Utilization
} from './types/types.js';
import { AwsServiceUtilization } from './service-utilizations/aws-service-utilization.js';
import { AwsServiceUtilizationFactory } from './service-utilizations/aws-service-utilization-factory.js';
import { AwsUtilizationProvider as AwsUtilizationProviderType } from './ops-types.js';

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

type AwsUtilizationProviderProps = AwsUtilizationProviderType & {
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

  constructor (props: AwsUtilizationProviderProps) {
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
    actionType: ActionType,
    resourceArn: string,
    region: string
  ) {
    const event: HistoryEvent = {
      service,
      actionType,
      actionName,
      resourceArn,
      region,
      timestamp: new Date().toISOString()
    };
    const history: HistoryEvent[] = await this.getSessionHistory();
    history.push(event);
    await this.utilizationClasses[service].doAction(credentialsProvider, actionName, resourceArn, region);
    await sessionHistoryCache.set('history', history);
  }

  async hardRefresh (
    credentialsProvider: AwsCredentialsProvider, region: string, overrides: AwsUtilizationOverrides = {}
  ) {
    for (const service of this.services) {
      const serviceOverrides = overrides[service];
      this.utilization[service] = await this.refreshUtilizationData(
        service, credentialsProvider, region, serviceOverrides
      );
      await utilizationCache.set(service, this.utilization[service]);
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
        await utilizationCache.set(service, this.utilization[service]);
      } else {
        this.utilization[service] = await utilizationCache.getOrElse(
          service,
          async () => await this.refreshUtilizationData(service, credentialsProvider, region, serviceOverrides)
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