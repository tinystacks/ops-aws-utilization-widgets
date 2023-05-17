import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { AwsResourceType, Utilization, actionTypeToEnum } from '../types/types.js';
import { 
  RecommendationsOverrides, 
  UtilizationRecommendationsWidget 
} from '../types/utilization-recommendations-types.js';
import { UtilizationRecommendationsUi } from './utilization-recommendations-ui/utilization-recommendations-ui.js';
import { filterUtilizationForActionType } from '../utils/utilization.js';
import get from 'lodash.get';

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
      await utilProvider.hardRefresh(awsCredsProvider);
    }

    this.utilization = await utilProvider.getUtilization(awsCredsProvider);

    if (overrides?.resourceActions) {
      const { actionType, resourceIds } = overrides.resourceActions;
      const resourceIdsSet = new Set<string>(resourceIds);
      const filteredServices = filterUtilizationForActionType(this.utilization, actionTypeToEnum[actionType]);
      
      for (const serviceUtil of Object.keys(filteredServices)) {
        const filteredServiceUtil = Object.keys(filteredServices[serviceUtil])
          .filter(resId => resourceIdsSet.has(resId));
        for (const resourceId of filteredServiceUtil) {
          const resource = filteredServices[serviceUtil][resourceId];
          for (const scenario of Object.keys(resource.scenarios)) {
            await utilProvider.doAction(
              serviceUtil, 
              awsCredsProvider, 
              get(resource.scenarios[scenario], `${actionType}.action`), 
              resourceId,
              get(resource.data, 'region', 'us-east-1')
            );
          }
        }
      }
    }
  }

  render (_children: any, overridesCallback?: (overrides: RecommendationsOverrides) => void) {
    function onResourcesAction (resourceIds: string[], actionType: string) {
      overridesCallback({
        resourceActions: { resourceIds, actionType }
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
        onResourcesAction={onResourcesAction}
        onRefresh={onRefresh}
      />
    );
  }
}