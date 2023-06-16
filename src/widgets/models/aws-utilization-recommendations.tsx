import { Models } from '@tinystacks/ops-core';
import {
  HasActionType,
  HasUtilization,
  Utilization
} from '../../types/index.js';
import {
  AwsResourceType,
  AwsUtilizationRecommendations as AwsUtilizationRecommendationsType
} from '../../ops-types.js';

import Widget = Models.Widget;

type AwsUtilizationRecommendationsProps = AwsUtilizationRecommendationsType & HasActionType & HasUtilization;

class AwsUtilizationRecommendations extends Widget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  constructor (props: AwsUtilizationRecommendationsProps) {
    super(props);
    this.utilization = props.utilization;
  }

  static fromJson (props: AwsUtilizationRecommendationsProps) {
    return new AwsUtilizationRecommendations(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization
    };
  }
}

export {
  AwsUtilizationRecommendations,
  AwsUtilizationRecommendationsProps
};
export default AwsUtilizationRecommendations;