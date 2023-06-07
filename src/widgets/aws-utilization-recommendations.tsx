import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { AwsResourceType, Utilization, actionTypeToEnum, HistoryEvent } from '../types/types.js';
import { 
  RecommendationsOverrides, 
  UtilizationRecommendationsWidget 
} from '../types/utilization-recommendations-types.js';
import { UtilizationRecommendationsUi } from './utilization-recommendations-ui/utilization-recommendations-ui.js';
import { filterUtilizationForActionType } from '../utils/utilization.js';
import get from 'lodash.get';

export class AwsUtilizationRecommendations extends BaseWidget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  sessionHistory: HistoryEvent[];
  region: string;
  constructor (props: UtilizationRecommendationsWidget) {
    super(props);
    this.utilization = props.utilization;
    this.region = props.region || 'us-east-1';
    this.sessionHistory = props.sessionHistory || [];
  }

  static fromJson (props: UtilizationRecommendationsWidget) {
    return new AwsUtilizationRecommendations(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      sessionHistory: this.sessionHistory,
      region: this.region
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
      await utilProvider.hardRefresh(awsCredsProvider);
    }

    this.utilization = await utilProvider.getUtilization(awsCredsProvider, [this.region]);
    this.sessionHistory = await utilProvider.getSessionHistory();

    if (overrides?.resourceActions) {
      const { actionType, resourceArns } = overrides.resourceActions;
      const resourceArnsSet = new Set<string>(resourceArns);
      const filteredServices = 
      filterUtilizationForActionType(this.utilization, actionTypeToEnum[actionType], this.sessionHistory);
      
      for (const serviceUtil of Object.keys(filteredServices)) {
        const filteredServiceUtil = Object.keys(filteredServices[serviceUtil])
          .filter(resArn => resourceArnsSet.has(resArn));
        for (const resourceArn of filteredServiceUtil) {
          const resource = filteredServices[serviceUtil][resourceArn];
          for (const scenario of Object.keys(resource.scenarios)) {
            await utilProvider.doAction(
              serviceUtil,
              awsCredsProvider, 
              get(resource.scenarios[scenario], `${actionType}.action`),
              actionTypeToEnum[actionType],
              resourceArn,
              get(resource.data, 'region', 'us-east-1')
            );
          }
        }
      }
    }
  }

  render (_children: any, overridesCallback?: (overrides: RecommendationsOverrides) => void) {
    function onResourcesAction (resourceArns: string[], actionType: string) {
      overridesCallback({
        resourceActions: { resourceArns, actionType }
      });
    }

    function onRefresh () {
      overridesCallback({
        refresh: true
      });
    }

    return (
      <UtilizationRecommendationsUi
        utilization={this.utilization || {}}
        sessionHistory={this.sessionHistory}
        onResourcesAction={onResourcesAction}
        onRefresh={onRefresh}
      />
    );
  }
}