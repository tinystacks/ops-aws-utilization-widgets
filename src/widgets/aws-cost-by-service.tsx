import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Stack } from '@chakra-ui/react';
import { getAwsCredentialsProvider, getAwsUtilizationProvider } from '../utils/utils.js';
import { Widget } from '@tinystacks/ops-model';
import { CostReport } from '../types/cost-and-usage-types.js';
import ReportBreakdown from '../components/cost-by-service/report-breakdown.js';

// should the time period be from start of the month to now? Instead of a month ago

type AwsCostByServiceType = Widget & {
  costReport?: CostReport; 
  region: string;
}

export class AwsCostByService extends BaseWidget {
  costReport?: CostReport;
  region: string;

  constructor (props: AwsCostByServiceType) {
    super(props);
    this.costReport = props.costReport || {
      report: {},
      hasCostReport: true,
      hasCostReportDefinition: true
    };
    this.region = props.region || 'us-east-1';
  }

  static fromJson (props: AwsCostByServiceType) {
    return new AwsCostByService(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      costReport: this.costReport,
      region: this.region
    };
  }

  async getData (providers?: BaseProvider[], _overrides?: any) {
    const awsCredentialsProvider = getAwsCredentialsProvider(providers);
    const utilProvider = getAwsUtilizationProvider(providers);
    this.costReport = await utilProvider.getCostReport(awsCredentialsProvider, this.region);

    console.log(JSON.stringify(this.costReport, null, 2));
  }

  render (_children: any, _overrides: any) {
    return (
      <Stack width='100%'>
        <ReportBreakdown costReport={this.costReport}></ReportBreakdown>
      </Stack>
    );
  }
}