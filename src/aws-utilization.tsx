import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsResourceType, AwsUtilizationOverrides, Utilization } from './types/types.js';
import { findProvider, getAwsCredentialsProvider } from './utils/utils.js';
import { AwsUtilizationProvider } from './aws-utilization-provider.js';

type AwsUtilizationType = Widget & {
   // utilizations: Utilization[];
  awsServices: AwsResourceType[];
  regions: string[];
  utilization: {
    [key: AwsResourceType | string]: Utilization<string>
  };
}

export class AwsUtilization extends BaseWidget {
  // utilizations: Utilization[];
  awsServices: AwsResourceType[];
  regions: string[];
  credentialsProvider?: AwsCredentialsProvider;
  utilizationProvider?: AwsUtilizationProvider;
  utilization: {
    [key: AwsResourceType | string]: Utilization<string>
  };

  constructor (props: AwsUtilizationType) {
    super(props);
    this.awsServices = props.awsServices;
    this.regions = props.regions;
    this.utilization = {};
  }

  static fromJson (props: AwsUtilizationType) {
    return new AwsUtilization(props);
  }

  toJson (): AwsUtilizationType {
    return {
      ...super.toJson(),
      awsServices: this.awsServices,
      regions: this.regions,
      utilization: this.utilization
    };
  }

  async getData (providers?: BaseProvider[], overrides?: AwsUtilizationOverrides): Promise<void> {
    this.credentialsProvider = getAwsCredentialsProvider(providers);
    
    this.utilizationProvider = findProvider<AwsUtilizationProvider>(providers, AwsUtilizationProvider.type);
    this.utilizationProvider?.initServices(this.awsServices);
    await this.utilizationProvider?.getUtilization(this.credentialsProvider, this.regions, overrides);
    this.utilization = this.utilizationProvider?.utilization;
  }
  
  render (_children?: (Widget & { renderedElement: JSX.Element; })[], _overridesCallback?: (overrides: AwsUtilizationOverrides) => void): JSX.Element {
    return <div>
      {JSON.stringify(this.utilization, null, 2)}
    </div>;
  }
}