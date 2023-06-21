import React from 'react';
import { Views } from '@tinystacks/ops-core';
import { 
  RecommendationsOverrides
} from '../../types/index.js';
import {
  UtilizationRecommendationsUi
} from './components/utilization-recommendations-ui.js';
import {
  AwsUtilizationRecommendations as AwsUtilizationRecommendationsModel,
  AwsUtilizationRecommendationsProps
} from '../models/aws-utilization-recommendations.js';

import Widget = Views.Widget;

class AwsUtilizationRecommendations extends AwsUtilizationRecommendationsModel implements Widget {
  static fromJson (props: AwsUtilizationRecommendationsProps) {
    return new AwsUtilizationRecommendations(props);
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

export {
  AwsUtilizationRecommendations
};
export default AwsUtilizationRecommendations;