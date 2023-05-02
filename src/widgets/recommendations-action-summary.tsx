import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { AwsResourceType, Utilization } from '../types/types.js';
import React from 'react';
import { RecommendationsActionsSummaryProps } from './recommendations-action-summary-types.js';
import { RecommendationsOverrides } from './recommendations-table-types.js';
import { RecommendationsActionSummaryUi } from './recommendations-action-summary-ui.js';
export class RecommendationsActionSummary extends BaseWidget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  deleteLink: string;
  optimizeLink: string;
  scaleDownLink: string;

  constructor (props: RecommendationsActionsSummaryProps) {
    super(props);
    this.utilization = props.utilization;
    this.deleteLink = props.deleteLink || 'delete-recommendations';
    this.optimizeLink = props.optimizeLink || 'optimize-recommendations';
    this.scaleDownLink = props.scaleDownLink || 'scale-down-recommendations';
  }

  static fromJson (props: RecommendationsActionsSummaryProps) {
    return new RecommendationsActionSummary(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      deleteLink: this.deleteLink,
      optimizeLink: this.optimizeLink,
      scaleDownLink: this.scaleDownLink
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
      <RecommendationsActionSummaryUi
        utilization={this.utilization}
        scaleDownLink={this.scaleDownLink}
        optimizeLink={this.optimizeLink}
        deleteLink={this.deleteLink}
      />
    );
  }
}