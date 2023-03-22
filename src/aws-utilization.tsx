import { BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';

type Assessments<T> = {
  [ Property in keyof T ]: T[Property];
};

type Alerts<T> = {
  [ Property in keyof T]: T[Property];
};

type Actions<T> = {
  [ Property in keyof T ]: T[Property];
};

// key is resource name
type ResourceUtilization<T> = {
  [ key: string ]: {
    assessments?: Assessments<T>;
    alerts?: Alerts<T>;
    actions?: Actions<T>;
  };
};

export type AwsUtilizationType = Widget & {
  region: string;
};

export abstract class AwsUtilization<T> extends BaseWidget {
  resourceUtilization: ResourceUtilization<T>;
  region: string;

  constructor (props: AwsUtilizationType) {
    super(props);
    this.resourceUtilization = {};
    this.region = props.region;
  }

  protected initUtilizationForResource (resourceName: string) {
    this.resourceUtilization[resourceName] = {};
    this.resourceUtilization[resourceName].assessments = {} as Assessments<T>;
    this.resourceUtilization[resourceName].alerts = {} as Alerts<T>;
    this.resourceUtilization[resourceName].actions = {} as Actions<T>;
    return {
      assessments: this.resourceUtilization[resourceName].assessments,
      alerts: this.resourceUtilization[resourceName].alerts,
      actions: this.resourceUtilization[resourceName].actions
    };
  }
}