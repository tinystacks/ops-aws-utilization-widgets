import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import RecommendationOverview from '../components/recommendation-overview.js';
import { AwsUtilizationOverrides, HistoryEvent, Utilization } from '../types/types.js';
import { Stack } from '@chakra-ui/react';

type AwsUtilizationType = Widget & {
  utilization: { [ serviceName: string ] : Utilization<string> },
  sessionHistory: HistoryEvent[]
  region: string
}

export class AwsUtilization extends BaseWidget {
  utilization: { [ serviceName: string ] : Utilization<string> };
  sessionHistory: HistoryEvent[];
  region: string;

  constructor (props: AwsUtilizationType) {
    super(props);
    this.region = props.region || 'us-east-1';
    this.utilization = props.utilization || {};
    this.sessionHistory = props.sessionHistory || [];
  }

  async getData (providers?: BaseProvider[]): Promise<void> {

    const depMap = {
      utils: './utils/utils.js'
    };
    const { getAwsCredentialsProvider, getAwsUtilizationProvider } = await import(depMap.utils);
    const utilProvider = getAwsUtilizationProvider(providers);
    const awsCredsProvider = getAwsCredentialsProvider(providers);
    this.utilization = await utilProvider.getUtilization(awsCredsProvider);
  }

  static fromJson (object: AwsUtilizationType): AwsUtilization {
    return new AwsUtilization(object);
  }

  toJson (): AwsUtilizationType {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      region: this.region, 
      sessionHistory: this.sessionHistory
    };
  }
  
  render (
    _children?: (Widget & { renderedElement: JSX.Element; })[],
    _overridesCallback?: (overrides: AwsUtilizationOverrides) => void
  ): JSX.Element {
    return (
      <Stack width='100%'>
        <RecommendationOverview utilizations={this.utilization} sessionHistory={this.sessionHistory}/>
      </Stack>
    );
  }
}