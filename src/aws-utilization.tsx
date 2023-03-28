import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import { AwsService, AwsServiceUtilizationFactory } from './aws-service-utilization-factory.js';
import { getAwsCredentialsProvider } from './utils/utils.js';

type AwsUtilizationType = Widget & {
  awsServices: AwsService[],
  region: string
}

export class AwsUtilization extends BaseWidget {
  awsServices: AwsService[];
  region: string;

  constructor (props: AwsUtilizationType) {
    super(props);
    this.awsServices = props.awsServices;
    this.region = props.region;
  }

  async getData (providers?: BaseProvider[], overrides?: any): Promise<void> {
    const awsCredentialsProvider = getAwsCredentialsProvider(providers);
    for (const awsService of this.awsServices) {
      const awsServiceUtilization = AwsServiceUtilizationFactory.createObject(awsService);
      const assessments = awsServiceUtilization.getAssessment(awsCredentialsProvider, this.region);
    }
  }
  
  render (children?: (Widget & { renderedElement: JSX.Element; })[], overridesCallback?: (overrides: any) => void): JSX.Element {
    return <></>;
  }
}