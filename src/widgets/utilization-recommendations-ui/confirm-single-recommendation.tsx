import { Stack, Heading, Button, Spacer, Flex } from '@chakra-ui/react';
import React from 'react';
import { ConfirmSingleRecommendationProps } from '../utilization-recommendations-types';

export function ConfirmSingleRecommendation (props: ConfirmSingleRecommendationProps) {
  const { resourceId, actionType, onRemoveResource } = props;
  const actionLabel = actionType.charAt(0).toUpperCase() + actionType.slice(1) + ' now';

  return (
    <Flex>
      <Stack>
        <Heading as='h5' size='sm'>{resourceId}</Heading>
      </Stack>
      {/* TODO */}
      {/* <Stack>
          <Text fontSize='sm' color='gray.500'>$19625</Text>
          <br />
        </Stack> */}
      <Spacer />
      <Stack>
        <Button colorScheme='red' size='sm'>{actionLabel}</Button>
        <Button variant='link' size='sm' onClick={() => onRemoveResource(resourceId)}>{'Don\'t ' + actionType}</Button>
      </Stack>
    </Flex>
  );
}