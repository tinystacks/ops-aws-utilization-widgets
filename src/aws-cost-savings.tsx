import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import { Utilization } from './types/types';

type AwsCostSavingsType = Widget & {
  utilizations: { [ serviceName: string ]: Utilization<string> };
};

export class AwsCostSavings extends BaseWidget {
  utilizations: { [ serviceName: string ]: Utilization<string> };

  constructor (props: AwsCostSavingsType) {
    super(props);
    this.utilizations = props.utilizations;
  }

  async getData (_providers?: BaseProvider[], _overrides?: any): Promise<void> {
    return;
  }
  render (_children?: (Widget & { renderedElement: JSX.Element })[], _overridesCallback?: (overrides: any) => void): JSX.Element {
    throw new Error('Method not implemented.');
  }
}