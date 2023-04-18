import { Account, ListRegionsCommandOutput } from '@aws-sdk/client-account';
import { STS } from '@aws-sdk/client-sts';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { BaseProvider } from '@tinystacks/ops-core';
import isEmpty from 'lodash.isempty';

export function getAwsCredentialsProvider (providers?: BaseProvider[]): AwsCredentialsProvider {
  if (!providers || isEmpty(providers)) {
    throw new Error('No AwsCredentialsProvider provided');
  }

  const provider = providers[0];
  if (providers[0].type !== AwsCredentialsProvider.type) {
    throw new Error(`The passed in provider ${provider.id} is not an AwsCredentialsProvider`);
  }

  return provider as AwsCredentialsProvider;
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