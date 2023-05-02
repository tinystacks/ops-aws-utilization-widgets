import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { ActionType, AwsResourceType, Utilization } from '../types/types.js';
import React from 'react';
import { RecommendationsOverrides } from './recommendations-table-types.js';
import { Widget } from '@tinystacks/ops-model';
import { ConfirmRecommendationsUi } from './confirm-recommendations-ui.js';

export type ConfirmRecommendationsProps = Widget & {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  actionType: ActionType;
  resourceIds: string[];
};

export class ConfirmRecommendations extends BaseWidget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  actionType: ActionType;
  resourceIds: string[];
  constructor (props: ConfirmRecommendationsProps) {
    super(props);
    this.utilization = props.utilization;
    this.actionType = props.actionType;
    this.resourceIds = props.resourceIds; //typeof props.resourceIds === 'string' ? JSON.parse(props.resourceIds) : props.resourceIds || [];
  }

  static fromJson (props: ConfirmRecommendationsProps) {
    return new ConfirmRecommendations(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      actionType: this.actionType,
      resourceIds: this.resourceIds
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

  render (_children?: []) {
    return <ConfirmRecommendationsUi 
      actionType={this.actionType}
      resourceIds={this.resourceIds}
    />;
  }
}