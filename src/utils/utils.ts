import { Account, ListRegionsCommandOutput } from '@aws-sdk/client-account';
import { STS } from '@aws-sdk/client-sts';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { BaseProvider } from '@tinystacks/ops-core';
import isEmpty from 'lodash.isempty';
import { AwsUtilizationProvider } from '../aws-utilization-provider.js';

export function getAwsUtilizationProvider (providers?: BaseProvider[]): AwsUtilizationProvider {
  if (!providers || isEmpty(providers)) {
    throw new Error('No AwsUtilizationProvider provided');
  }

  const provider = providers.find(p => p.type === AwsUtilizationProvider.type);
  if (!provider) {
    throw new Error('No AwsUtilizationProvider provided');
  }

  return provider as AwsUtilizationProvider;
}

export function getAwsCredentialsProvider (providers?: BaseProvider[]): AwsCredentialsProvider {
  if (!providers || isEmpty(providers)) {
    throw new Error('No AwsCredentialsProvider provided');
  }

  const provider = providers.find(p => p.type === AwsCredentialsProvider.type);
  if (!provider) {
    throw new Error('No AwsCredentialsProvider provided');
  }

  return provider as AwsCredentialsProvider;
}

export function findProvider<T extends BaseProvider> (providers: BaseProvider[] = [], providerType: string): T {
  if (!providers || isEmpty(providers)) {
    throw new Error('No providers are available!');
  }

  const provider = providers.find(p => p.type === providerType);
  if (!provider) {
    throw new Error(`No ${providerType}s are available!`);
  }

  return provider as T;
}

export async function listAllRegions (credentials: any) {
  const accountClient = new Account({
    credentials,
    region: 'us-east-1'
  });

  let regions: string[] = [];
  let listRegionsRes: ListRegionsCommandOutput;
  do {
    listRegionsRes = await accountClient.listRegions({
      RegionOptStatusContains: ['ENABLED', 'ENABLED_BY_DEFAULT'],
      NextToken: listRegionsRes?.NextToken
    });
    regions = [ ...regions, ...listRegionsRes.Regions.map(region => region.RegionName) ];
  } while (listRegionsRes?.NextToken);

  return regions;
}

export async function getAccountId (credentials: any) {
  const stsClient = new STS({
    credentials,
    region: 'us-east-1'
  });

  return (await stsClient.getCallerIdentity({}))?.Account;
}