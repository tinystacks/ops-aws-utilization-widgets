import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import { AwsService, AwsServiceUtilizationFactory } from './aws-service-utilization-factory.js';
import { AwsUtilizationOverrides } from './types/types.js';
import { getAwsCredentialsProvider } from './utils/utils.js';

type AwsUtilizationType = Widget & {
   // utilizations: Utilization[];
  awsServices: AwsService[],
  regions: string[]
}

export class AwsUtilization extends BaseWidget {
  // utilizations: Utilization[];
  awsServices: AwsService[];
  regions: string[];

  constructor (props: AwsUtilizationType) {
    super(props);
    this.awsServices = props.awsServices;
    this.regions = props.regions;
  }

  async getData (providers?: BaseProvider[], overrides?: AwsUtilizationOverrides): Promise<void> {
    const awsCredentialsProvider = getAwsCredentialsProvider(providers);
    for (const awsService of this.awsServices) {
      const awsServiceUtilization = AwsServiceUtilizationFactory.createObject(awsService);
      await awsServiceUtilization.getUtilization(awsCredentialsProvider, this.regions, overrides[awsService]);
    }
  }
  
  render (_children?: (Widget & { renderedElement: JSX.Element; })[], _overridesCallback?: (overrides: AwsUtilizationOverrides) => void): JSX.Element {
    return <></>;
  }
}