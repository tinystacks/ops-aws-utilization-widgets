import { HStack, Stack, Text, Heading, Button } from '@chakra-ui/react';
import React from 'react';

export type ConfirmSingleRecommendationProps = {
  resourceId: string;
  actionType: string;
};

export function ConfirmSingleRecommendation (props: ConfirmSingleRecommendationProps) {
  const { resourceId, actionType } = props;
  const actionLabel = actionType.charAt(0).toUpperCase() + actionType.slice(1) + ' now';

  return (
    <HStack>
      <Stack>
        <Heading as='h5' size='sm'>{resourceId}</Heading>
        <Text fontSize='sm' color='gray.500'>{resourceId /* This should be the full ARN or id */}</Text>
      </Stack>
      {/* TODO */}
      {/* <Stack>
          <Text fontSize='sm' color='gray.500'>$19625</Text>
          <br />
        </Stack> */}
      <Stack>
        <Button colorScheme='red' size='sm'>{actionLabel}</Button>
        <Button variant='link' size='sm'>{'Don\'t ' + actionType}</Button>
      </Stack>
    </HStack>
  );
}