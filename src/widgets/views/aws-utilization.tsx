import React from 'react';
import { Widget as WidgetType } from '@tinystacks/ops-model';
import { Views } from '@tinystacks/ops-core';
import { Stack } from '@chakra-ui/react';
import RecommendationOverview from './components/recommendation-overview.js';
import { AwsUtilizationOverrides } from '../../types/index.js';
import {
  AwsUtilization as AwsUtilizationModel,
  AwsUtilizationProps
} from '../models/aws-utilization.js';

import Widget = Views.Widget;

export class AwsUtilization extends AwsUtilizationModel implements Widget {
  static fromJson (object: AwsUtilizationProps): AwsUtilization {
    return new AwsUtilization(object);
  }
  
  render (
    _children?: (WidgetType & { renderedElement: JSX.Element; })[],
    _overridesCallback?: (overrides: AwsUtilizationOverrides) => void
  ): JSX.Element {
    return (
      <Stack width='100%'>
        <RecommendationOverview utilizations={this.utilization}/>
      </Stack>
    );
  }
}