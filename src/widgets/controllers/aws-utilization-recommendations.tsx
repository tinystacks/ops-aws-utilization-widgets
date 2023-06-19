import get from 'lodash.get';
import { Controllers, Provider } from '@tinystacks/ops-core';
import {
  AwsUtilizationRecommendations as AwsUtilizationRecommendationsModel,
  AwsUtilizationRecommendationsProps
} from '../models/aws-utilization-recommendations.js';
import { RecommendationsOverrides, actionTypeToEnum } from '../../types/index.js';
import {
  filterUtilizationForActionType,
  getAwsCredentialsProvider,
  getAwsUtilizationProvider
} from '../../utils/index.js';

import Widget = Controllers.Widget;

class AwsUtilizationRecommendations extends AwsUtilizationRecommendationsModel implements Widget {
  static fromJson (props: AwsUtilizationRecommendationsProps) {
    return new AwsUtilizationRecommendations(props);
  }

  async getData (providers: Provider[], overrides?: RecommendationsOverrides) {
    const utilProvider = getAwsUtilizationProvider(providers);
    const awsCredsProvider = getAwsCredentialsProvider(providers);
    
    if (overrides?.refresh) {
      await utilProvider.hardRefresh(awsCredsProvider);
    }

    this.utilization = await utilProvider.getUtilization(awsCredsProvider);

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
}

export {
  AwsUtilizationRecommendations
};
export default AwsUtilizationRecommendations;