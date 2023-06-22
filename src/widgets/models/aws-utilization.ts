import { Models } from '@tinystacks/ops-core';
import { Utilization, HistoryEvent } from '../../types/index.js';
import { AwsUtilization as AwsUtilizationType } from '../../ops-types.js';

import Widget = Models.Widget;

type AwsUtilizationProps = AwsUtilizationType & {
  utilization?: { [ serviceName: string ] : Utilization<string> };
  sessionHistory?: HistoryEvent[];
  region?: string;
}

class AwsUtilization extends Widget {
  utilization: { [ serviceName: string ] : Utilization<string> };
  sessionHistory: HistoryEvent[];
  region: string;

  constructor (props: AwsUtilizationProps) {
    super(props);
    this.region = props.region || 'us-east-1';
    this.utilization = props.utilization || {};
    this.sessionHistory = props.sessionHistory || [];
  }

  static fromJson (object: AwsUtilizationProps): AwsUtilization {
    return new AwsUtilization(object);
  }

  toJson (): AwsUtilizationProps {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      region: this.region,
      sessionHistory: this.sessionHistory
    };
  }
}

export {
  AwsUtilization,
  AwsUtilizationProps
};
export default AwsUtilization;