import { Controllers, Provider } from '@tinystacks/ops-core';
import {
  AwsUtilization as AwsUtilizationModel,
  AwsUtilizationProps
} from '../models/aws-utilization.js';
import {
  getAwsCredentialsProvider,
  getAwsUtilizationProvider
} from '../../utils/index.js';

import Widget = Controllers.Widget;

class AwsUtilization extends AwsUtilizationModel implements Widget {
  static fromJson (object: AwsUtilizationProps): AwsUtilization {
    return new AwsUtilization(object);
  }

  async getData (providers?: Provider[]): Promise<void> {
    const utilProvider = getAwsUtilizationProvider(providers);
    const awsCredsProvider = getAwsCredentialsProvider(providers);
    this.utilization = await utilProvider.getUtilization(awsCredsProvider);
  }
}

export {
  AwsUtilization
};
export default AwsUtilization;