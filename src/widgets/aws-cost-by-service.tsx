import React from 'react';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Organizations } from '@aws-sdk/client-organizations';
import { Account } from '@aws-sdk/client-account';
import { Stack } from '@chakra-ui/react';
import { getAwsCredentialsProvider, getAwsUtilizationProvider } from '../utils/utils.js';
import { Widget } from '@tinystacks/ops-model';
import { AccountIdMap, CostReport } from '../types/cost-and-usage-types.js';
import { STS } from '@aws-sdk/client-sts';
import ReportBreakdown from '../components/cost-by-service/report-breakdown.js';

type AwsCostByServiceType = Widget & {
  region: string;
  allRegions?: string[];
  costReport?: CostReport;
  accountName?: string;
  accountIdMap?: AccountIdMap;
};

type AwsCostByServiceOverrides = {
  accountId?: string;
  region?: string;
};

export class AwsCostByService extends BaseWidget {
  region: string;
  allRegions: string[];
  costReport: CostReport;
  accountName: string;
  accountIdMap: AccountIdMap;

  constructor (props: AwsCostByServiceType) {
    super(props);
    this.region = props.region || 'us-east-1';
    this.allRegions = props.allRegions || [ this.region ];
    this.costReport = props.costReport || {
      report: {},
      hasCostReport: true,
      hasCostReportDefinition: true,
      serviceCostsPerMonth: {},
      monthLabels: []
    };
    this.accountName = props.accountName || '';
    this.accountIdMap = props.accountIdMap || {};
  }

  static fromJson (props: AwsCostByServiceType) {
    return new AwsCostByService(props);
  }

  toJson (): AwsCostByServiceType {
    return {
      ...super.toJson(),
      region: this.region,
      allRegions: this.allRegions,
      costReport: this.costReport,
      accountName: this.accountName,
      accountIdMap: this.accountIdMap
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
    const accountClient = new Account({
      credentials,
      region: this.region
    });
    
    const accountId = overrides?.accountId || (await stsClient.getCallerIdentity({})).Account;
    await organizationsClient.listAccounts({}).then((res) => {
      res.Accounts.forEach((account) => {
        if (account.Id === accountId) { this.accountName = account.Name; }
        this.accountIdMap[account.Name] = account.Id;
      });
    }).catch(() => {
      this.accountName = accountId;
      this.accountIdMap[accountId] = accountId;
    });

    this.region = overrides?.region || this.region;
    await accountClient.listRegions({
      RegionOptStatusContains: ['ENABLED', 'ENABLED_BY_DEFAULT']
    }).then((res) => {
      this.allRegions = res.Regions.map(region => region.RegionName);
    }).catch(() => {
      this.allRegions = [ this.region ];
    });

    this.costReport = await utilProvider.getCostReport(awsCredentialsProvider, this.region, accountId);
  }

  render (_children: any, overridesCallback?: (overrides: AwsCostByServiceOverrides) => void) {
    const useAccountIdSelector = {
      accountName: this.accountName,
      accountIdMap: this.accountIdMap,
      onAccountIdChange: (accountId: string) => overridesCallback({
        accountId
      })
    };

    const useRegionSelector = {
      region: this.region,
      allRegions: this.allRegions,
      onRegionChange: (region: string) => overridesCallback({
        region
      })
    };

    return (
      <Stack width='100%'>
        <ReportBreakdown 
          costReport={this.costReport}
          useAccountIdSelector={useAccountIdSelector}
          useRegionSelector={useRegionSelector}
        />
      </Stack>
    );
  }
}