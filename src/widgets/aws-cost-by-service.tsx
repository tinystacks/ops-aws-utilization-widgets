import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Organizations } from '@aws-sdk/client-organizations';
import { Stack } from '@chakra-ui/react';
import { getAwsCredentialsProvider, getAwsUtilizationProvider } from '../utils/utils.js';
import { Widget } from '@tinystacks/ops-model';
import { CostReport } from '../types/cost-and-usage-types.js';
import { STS } from '@aws-sdk/client-sts';
import ReportBreakdown from '../components/cost-by-service/report-breakdown.js';

// should the time period be from start of the month to now? Instead of a month ago

type AwsCostByServiceType = Widget & {
  region: string;
  costReport?: CostReport;
  accountId?: string;
  allAccountIds?: string[];
};

type AwsCostByServiceOverrides = {
  accountId?: string;
};

export class AwsCostByService extends BaseWidget {
  region: string;
  costReport: CostReport;
  accountId: string;
  allAccountIds: string[];

  constructor (props: AwsCostByServiceType) {
    super(props);
    this.region = props.region || 'us-east-1';
    this.costReport = props.costReport || {
      report: {},
      hasCostReport: true,
      hasCostReportDefinition: true
    };
    this.accountId = props.accountId || '';
    this.allAccountIds = props.allAccountIds || [];
  }

  static fromJson (props: AwsCostByServiceType) {
    return new AwsCostByService(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      region: this.region,
      costReport: this.costReport,
      accountId: this.accountId,
      allAccountIds: this.allAccountIds
    };
  }

  async getData (providers?: BaseProvider[], overrides?: AwsCostByServiceOverrides) {
    const awsCredentialsProvider = getAwsCredentialsProvider(providers);
    const utilProvider = getAwsUtilizationProvider(providers);

    const credentials = await awsCredentialsProvider.getCredentials();
    const organizationsClient = new Organizations({
      credentials,
      region: this.region
    });
    const stsClient = new STS({
      credentials,
      region: this.region
    });
    
    this.accountId = overrides?.accountId || (await stsClient.getCallerIdentity({})).Account;
    this.allAccountIds = await organizationsClient.listAccounts({}).then((res) => {
      return res.Accounts.map(account => account.Id);
    }).catch(() => [ this.accountId ]);

    this.costReport = await utilProvider.getCostReport(awsCredentialsProvider, this.region, this.accountId);
  }

  render (_children: any, overridesCallback?: (overrides: AwsCostByServiceOverrides) => void) {
    const useAccountIdSelector = {
      accountId: this.accountId,
      allAccountIds: this.allAccountIds,
      onAccountIdChange: (accountId: string) => overridesCallback({
        accountId
      })
    };

    return (
      <Stack width='100%'>
        <ReportBreakdown 
          costReport={this.costReport}
          useAccountIdSelector={useAccountIdSelector}
        />
      </Stack>
    );
  }
}