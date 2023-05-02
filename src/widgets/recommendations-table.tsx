import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { ActionType, AwsResourceType, Utilization } from '../types/types.js';
import { RecommendationsOverrides, RecommendationsTableProps } from './recommendations-table-types.js';
import { RecommendationsTableUi } from './recommendations-table-ui.js';
import React from 'react';

export class RecommendationsTable extends BaseWidget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  actionType?: ActionType;
  constructor (props: RecommendationsTableProps) {
    super(props);
    this.utilization = props.utilization;
    this.actionType = props.actionType || ActionType.DELETE;
  }

  static fromJson (props: RecommendationsTableProps) {
    return new RecommendationsTable(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      actionType: this.actionType
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
      <RecommendationsTableUi
        utilization={this.utilization}
        actionType={this.actionType}
      />
    );
  }
}