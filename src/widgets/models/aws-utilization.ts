import { Models } from '@tinystacks/ops-core';
import { Utilization } from '../../types/index.js';
import { AwsUtilization as AwsUtilizationType } from '../../ops-types.js';

import Widget = Models.Widget;

type AwsUtilizationProps = AwsUtilizationType & {
  utilization: { [ serviceName: string ] : Utilization<string> };
}

class AwsUtilization extends Widget {
  utilization: { [ serviceName: string ] : Utilization<string> };
  region: string;

  constructor (props: AwsUtilizationProps) {
    super(props);
    this.region = props.region || 'us-east-1';
    this.utilization = props.utilization || {};
  }

  static fromJson (object: AwsUtilizationProps): AwsUtilization {
    return new AwsUtilization(object);
  }

  toJson (): AwsUtilizationProps {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      region: this.region
    };
  }
}

export {
  AwsUtilization,
  AwsUtilizationProps
};
export default AwsUtilization;