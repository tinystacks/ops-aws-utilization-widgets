import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import { AwsService, AwsServiceUtilizationFactory } from './aws-service-utilization-factory.js';
import { getAwsCredentialsProvider } from './utils/utils.js';

// type Assessments<T> = {
//   [ Property in keyof T ]: T[Property];
// };

// type Alerts<T> = {
//   [ Property in keyof T]: T[Property];
// };

// type Actions<T> = {
//   [ Property in keyof T ]: T[Property];
// };

// // key is resource name
// type ResourceUtilization<T> = {
//   [ key: string ]: {
//     assessments?: Assessments<T>;
//     alerts?: Alerts<T>;
//     actions?: Actions<T>;
//   };
// };

// export type AwsUtilizationType = Widget & {
//   region: string;
// };

// export abstract class AwsUtilization<T> extends BaseWidget {
//   resourceUtilization: ResourceUtilization<T>;
//   region: string;

//   constructor (props: AwsUtilizationType) {
//     super(props);
//     this.resourceUtilization = {};
//     this.region = props.region;
//   }

//   protected initUtilizationForResource (resourceName: string) {
//     this.resourceUtilization[resourceName] = {};
//     this.resourceUtilization[resourceName].assessments = {} as Assessments<T>;
//     this.resourceUtilization[resourceName].alerts = {} as Alerts<T>;
//     this.resourceUtilization[resourceName].actions = {} as Actions<T>;
//     return {
//       assessments: this.resourceUtilization[resourceName].assessments,
//       alerts: this.resourceUtilization[resourceName].alerts,
//       actions: this.resourceUtilization[resourceName].actions
//     };
//   }
// }

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