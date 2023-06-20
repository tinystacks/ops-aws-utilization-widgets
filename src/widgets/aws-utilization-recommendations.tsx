import React from 'react';
import get from 'lodash.get';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { AwsResourceType, Utilization, actionTypeToEnum } from '../types/types.js';
import { 
  RecommendationsOverrides,
  HasActionType,
  HasUtilization,
  Regions
} from '../types/utilization-recommendations-types.js';
import { 
  UtilizationRecommendationsUi 
} from '../components/utilization-recommendations-ui/utilization-recommendations-ui.js';
import { filterUtilizationForActionType } from '../utils/utilization.js';
import { AwsUtilizationRecommendations as AwsUtilizationRecommendationsType } from '../ops-types.js';

export type AwsUtilizationRecommendationsProps = 
  AwsUtilizationRecommendationsType & 
  HasActionType & 
  HasUtilization & 
  Regions;

export class AwsUtilizationRecommendations extends BaseWidget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  allRegions?: string[];
  region?: string;

  constructor (props: AwsUtilizationRecommendationsProps) {
    super(props);
    this.utilization = props.utilization;
    this.allRegions = props.allRegions;
    this.region = props.region || 'us-east-1';
  }

  static fromJson (props: AwsUtilizationRecommendationsProps) {
    return new AwsUtilizationRecommendations(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      allRegions: this.allRegions,
      region: this.region
    };
  }

  async getData (providers: BaseProvider[], overrides?: RecommendationsOverrides) {
    const depMap = {
      utils: '../utils/utils.js'
    };
    const { 
      getAwsCredentialsProvider, 
      getAwsUtilizationProvider,
      listAllRegions
    } = await import(depMap.utils);
    const utilProvider = getAwsUtilizationProvider(providers);
    const awsCredsProvider = getAwsCredentialsProvider(providers);
    this.allRegions = await listAllRegions(awsCredsProvider);

    if (overrides?.refresh) {
      await utilProvider.hardRefresh(awsCredsProvider, this.region);
    }

    if (overrides?.region) {
      this.region = overrides.region;
      await utilProvider.hardRefresh(awsCredsProvider, this.region);
    }

    this.utilization = await utilProvider.getUtilization(awsCredsProvider, this.region);

    if (overrides?.resourceActions) {
      const { actionType, resourceArns } = overrides.resourceActions;
      const resourceArnsSet = new Set<string>(resourceArns);
      const filteredServices = filterUtilizationForActionType(this.utilization, actionTypeToEnum[actionType]);
      
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

    function onRegionChange (region: string) {
      overridesCallback({
        region
      });
    }

    return (
      <UtilizationRecommendationsUi
        utilization={this.utilization || {}}
        onResourcesAction={onResourcesAction}
        onRefresh={onRefresh}
        allRegions={this.allRegions || []}
        region={this.region}
        onRegionChange={onRegionChange}
      />
    );
  }
}