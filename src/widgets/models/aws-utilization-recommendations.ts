import { Models } from '@tinystacks/ops-core';
import {
  HasActionType,
  HasUtilization,
  Utilization,
  Regions,
  HistoryEvent
} from '../../types/index.js';
import {
  AwsResourceType,
  AwsUtilizationRecommendations as AwsUtilizationRecommendationsType
} from '../../ops-types.js';

import Widget = Models.Widget;

type AwsUtilizationRecommendationsProps = 
  AwsUtilizationRecommendationsType &
  HasActionType &
  HasUtilization &
  Regions;

class AwsUtilizationRecommendations extends Widget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  sessionHistory: HistoryEvent[];
  allRegions?: string[];
  region?: string;

  constructor (props: AwsUtilizationRecommendationsProps) {
    super(props);
    this.utilization = props.utilization;
    this.allRegions = props.allRegions;
    this.region = props.region || 'us-east-1';
    this.sessionHistory = props.sessionHistory || [];
  }

  static fromJson (props: AwsUtilizationRecommendationsProps) {
    return new AwsUtilizationRecommendations(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      allRegions: this.allRegions,
      region: this.region,
      sessionHistory: this.sessionHistory
    };
  }
}

export {
  AwsUtilizationRecommendations,
  AwsUtilizationRecommendationsProps
};
export default AwsUtilizationRecommendations;