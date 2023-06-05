import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { getAwsCredentialsProvider, getAwsUtilizationProvider } from '../utils/utils.js';
import { Widget } from '@tinystacks/ops-model';
import { CostPerResourceReport } from '../types/types.js';
import { CostExplorer } from '@aws-sdk/client-cost-explorer';
import dayjs from 'dayjs';


// should the time period be from start of the month to now? Instead of a month ago

type AwsCostByServiceType = Widget & {
  costPerResourceReport?: CostPerResourceReport;
  region?: string;
}

export class AwsCostByService extends BaseWidget {
  costPerResourceReport?: CostPerResourceReport;
  region?: string;

  constructor (props: AwsCostByServiceType) {
    super(props);
    this.costPerResourceReport = props.costPerResourceReport;
    this.region = props.region || 'us-east-1';
  }

  static fromJson (props: AwsCostByServiceType) {
    return new AwsCostByService(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      costPerResourceReport: this.costPerResourceReport,
      region: this.region
    };
  }

  async getData (providers?: BaseProvider[], _overrides?: any) {
    const awsCredentialsProvider = getAwsCredentialsProvider(providers);
    const utilProvider = getAwsUtilizationProvider(providers);
    const costExplorerClient = new CostExplorer({
      credentials: await awsCredentialsProvider.getCredentials(),
      region: this.region
    });

    const now = dayjs();
    // const startTime = now.subtract(1, 'month');
    console.log(dayjs().startOf('month').format('YYYY-MM-DD'));
    const res = await costExplorerClient.getCostAndUsage({
      TimePeriod: {
        Start: dayjs().startOf('month').format('YYYY-MM-DD'),
        End: now.format('YYYY-MM-DD')
      },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }
      ]
    });
    console.log(res);

    this.costPerResourceReport = await utilProvider.getCostPerResource(awsCredentialsProvider, this.region);


  }

  render () {
    return <></>;
  }
}