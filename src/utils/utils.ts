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