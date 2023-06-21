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

export async function listAllRegions (awsCredentialsProvider: AwsCredentialsProvider) {
  const accountClient = new Account({
    credentials: await awsCredentialsProvider.getCredentials(),
    region: 'us-east-1'
  });

  let regions: string[] = [];
  let listRegionsRes: ListRegionsCommandOutput;
  do {
    listRegionsRes = await accountClient.listRegions({
      RegionOptStatusContains: ['ENABLED', 'ENABLED_BY_DEFAULT'],
      NextToken: listRegionsRes?.NextToken
    });
    regions = [...regions, ...listRegionsRes.Regions.map(region => region.RegionName)];
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

export async function addFullJitter (attempt: number, cap = 5000, base = 3000, min = 3000) {
  const randomBetween = Math.floor(Math.random() * (Math.min(cap, base * 2 ** attempt) - min + 1) + min);
  await new Promise(r => setTimeout(r, randomBetween));
}

export function rateLimitMap (
  array: any[], requestsPerSec: number, maxInFlight: number, fn: (...args: any[]) => Promise<void>
) {
  return new Promise((resolve, reject) => {
    let index = 0;
    let inFlightCntr = 0;
    let doneCntr = 0;
    const launchTimes: number[] = [];
    const results = new Array(array.length);

    // calculate num requests in last second
    function calcRequestsInLastSecond () {
      const now = Date.now();
      // look backwards in launchTimes to see how many were launched within the last second
      let cnt = 0;
      for (let i = launchTimes.length - 1; i >= 0; i--) {
        if (now - launchTimes[i] < 1000) {
          ++cnt;
        } else {
          break;
        }
      }
      return cnt;
    }

    function runMore () {
      while (index < array.length && inFlightCntr < maxInFlight && calcRequestsInLastSecond() < requestsPerSec) {
        (function (i) {
          ++inFlightCntr;
          launchTimes.push(Date.now());
          fn(array[i]).then((val: any) => {
            results[i] = val;
            --inFlightCntr;
            ++doneCntr;
            runMore();
          }, reject);
        })(index);
        ++index;
      }
      // see if we're done
      if (doneCntr === array.length) {
        resolve(results);
      } else if (launchTimes.length >= requestsPerSec) {
        // calc how long we have to wait before sending more
        let delta = 1000 - (Date.now() - launchTimes[launchTimes.length - requestsPerSec]);
        if (delta >= 0) {
          setTimeout(runMore, ++delta);
        }
      }
    }
    runMore();
  });
}

export function round (val: number, decimalPlace: number) {
  const factor = 10 ** decimalPlace;
  return Math.round(val * factor) / factor;
}

export function getHourlyCost (monthlyCost: number) {
  return (monthlyCost / 30) / 24;
}