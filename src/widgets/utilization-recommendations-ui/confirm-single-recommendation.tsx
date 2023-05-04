import {
  Stack, Heading, Button, Spacer, Flex, Text, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader,
  ModalOverlay, useDisclosure
} from '@chakra-ui/react';
import React from 'react';
import { ConfirmSingleRecommendationProps } from '../utilization-recommendations-types.js';
import { actionTypeText } from '../../types/types.js';

export function ConfirmSingleRecommendation (props: ConfirmSingleRecommendationProps) {
  const { resourceId, actionType, onRemoveResource, onResourcesAction } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const actionLabel = actionTypeText[actionType].charAt(0).toUpperCase() + actionTypeText[actionType].slice(1) + ' now';

  return (
    <Stack w="100%" pb='1'>
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
          <Button colorScheme='red' size='sm' onClick={onOpen}>{actionLabel}</Button>
          <Button variant='link' size='sm' onClick={() => onRemoveResource(resourceId)}>
            {'Don\'t ' + actionTypeText[actionType]}
          </Button>
        </Stack>
      </Flex>
      <hr />
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm {actionType}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>You are about to {actionType} the resource with id {resourceId}.</Text>
            <Button
              colorScheme='red'
              size='sm'
              onClick={() => {
                onResourcesAction([resourceId], actionType);
                onRemoveResource(resourceId);
              }}
            >
              {actionLabel}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Stack>
  );
}