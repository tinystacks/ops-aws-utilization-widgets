import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import { AwsService, AwsServiceUtilizationFactory } from './aws-service-utilization-factory.js';
import RecommendationOverview from './components/recommendation-overview.js';
import { AwsUtilizationOverrides, Utilization } from './types/types.js';
import { getAwsCredentialsProvider } from './utils/utils.js';
import { Stack } from '@chakra-ui/react';

type AwsUtilizationType = Widget & {
  utilizations?: { [ serviceName: string ] : Utilization<string> },
  awsServices: AwsService[],
  region: string
}

export class AwsUtilization extends BaseWidget {
  utilizations: { [ serviceName: string ] : Utilization<string> };
  awsServices: AwsService[];
  region: string;

  constructor (props: AwsUtilizationType) {
    super(props);
    this.awsServices = props.awsServices;
    this.region = props.region;
    this.utilizations = props.utilizations || {};
  }

  async getData (providers?: BaseProvider[], overrides?: AwsUtilizationOverrides): Promise<void> {
    const awsCredentialsProvider = getAwsCredentialsProvider(providers);
    for (const awsService of this.awsServices) {
      const awsServiceUtilization = AwsServiceUtilizationFactory.createObject(awsService);
      await awsServiceUtilization.getUtilization(awsCredentialsProvider, this.region, overrides ? overrides[awsService]: undefined);
      this.utilizations[awsService] = awsServiceUtilization.utilization;
    }
  }

  static fromJson (object: AwsUtilizationType): AwsUtilization {
    return new AwsUtilization(object);
  }

  toJson (): AwsUtilizationType {
    return {
      ...super.toJson(),
      utilizations: this.utilizations,
      awsServices: this.awsServices,
      region: this.region
    };
  }
  
  render (_children?: (Widget & { renderedElement: JSX.Element; })[], _overridesCallback?: (overrides: AwsUtilizationOverrides) => void): JSX.Element {
    return (
      <Stack width='100%'>
        <RecommendationOverview utilizations={this.utilizations}/>
      </Stack>
    );
  }
}