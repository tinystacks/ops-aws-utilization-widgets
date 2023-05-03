import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { AwsResourceType, Utilization } from '../types/types.js';
import { RecommendationsOverrides, UtilizationRecommendationsWidget } from './utilization-recommendations-types.js';
import React from 'react';
import { UtilizationRecommendationsUi } from './utilization-recommendations-ui/utilization-recommendations-ui.js';

export class AwsUtilizationRecommendations extends BaseWidget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  constructor (props: UtilizationRecommendationsWidget) {
    super(props);
    this.utilization = props.utilization;
  }

  static fromJson (props: UtilizationRecommendationsWidget) {
    return new AwsUtilizationRecommendations(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization
    };
  }

  async getData (providers: BaseProvider[], overrides?: RecommendationsOverrides) {
    const depMap = {
      utils: '../utils/utils.js'
    };
    const { getAwsCredentialsProvider, getAwsUtilizationProvider } = await import(depMap.utils);
    const utilProvider = getAwsUtilizationProvider(providers);
    const awsCredsProvider = getAwsCredentialsProvider(providers);
    
    if (overrides?.refresh) {
      await utilProvider.hardRefresh(awsCredsProvider, ['us-east-1']);
    }

    this.utilization = await utilProvider.getUtilization(awsCredsProvider, ['us-east-1']);
  }

  render () {
    return (
      <UtilizationRecommendationsUi
        utilization={this.utilization || {}}
      />
    );
  }
}