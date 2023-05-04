import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import RecommendationOverview from './components/recommendation-overview.js';
import { AwsResourceType, AwsUtilizationOverrides, Utilization } from './types/types.js';
import { findProvider, getAwsCredentialsProvider } from './utils/utils.js';
import { Stack } from '@chakra-ui/react';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsUtilizationProvider } from './aws-utilization-provider.js';

type AwsUtilizationType = Widget & {
  utilization: { [ serviceName: string ] : Utilization<string> },
  awsServices: AwsResourceType[],
  regions: string[]
}

export class AwsUtilization extends BaseWidget {
  utilization: { [ serviceName: string ] : Utilization<string> };
  awsServices: AwsResourceType[];
  regions: string[];
  credentialsProvider?: AwsCredentialsProvider;
  utilizationProvider?: AwsUtilizationProvider;

  constructor (props: AwsUtilizationType) {
    super(props);
    this.awsServices = props.awsServices;
    this.regions = props.regions;
    this.utilization = props.utilization || {};
  }

  async getData (providers?: BaseProvider[], overrides?: AwsUtilizationOverrides): Promise<void> {
    this.credentialsProvider = getAwsCredentialsProvider(providers);

    this.utilizationProvider = findProvider<AwsUtilizationProvider>(providers, AwsUtilizationProvider.type);
    this.utilizationProvider?.initServices(this.awsServices);
    await this.utilizationProvider?.getUtilization(this.credentialsProvider, this.regions, overrides);
    this.utilization = this.utilizationProvider?.utilization;
  }

  static fromJson (object: AwsUtilizationType): AwsUtilization {
    return new AwsUtilization(object);
  }

  toJson (): AwsUtilizationType {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      awsServices: this.awsServices,
      regions: this.regions
    };
  }
  
  render (
    _children?: (Widget & { renderedElement: JSX.Element; })[],
    _overridesCallback?: (overrides: AwsUtilizationOverrides) => void
  ): JSX.Element {
    return (
      <Stack width='100%'>
        <RecommendationOverview utilizations={this.utilization}/>
      </Stack>
    );
  }
}