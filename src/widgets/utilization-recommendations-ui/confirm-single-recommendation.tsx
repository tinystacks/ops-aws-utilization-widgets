import {
  Stack, Button, Spacer, Flex, Text, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader,
  ModalOverlay, useDisclosure
} from '@chakra-ui/react';
import React from 'react';
import { ConfirmSingleRecommendationProps } from '../../types/utilization-recommendations-types.js';
import { actionTypeText } from '../../types/types.js';

export function ConfirmSingleRecommendation (props: ConfirmSingleRecommendationProps) {
  const { resourceArn, actionType, onRemoveResource, onResourcesAction } = props;
  // TODO: const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen, onClose } = useDisclosure();
  const actionLabel = actionTypeText[actionType].charAt(0).toUpperCase() + actionTypeText[actionType].slice(1) + ' now';

  return (
    <Stack w="100%" pb='2' pt='2'>
      <Flex>
        <Stack>
          <Text>{resourceArn}</Text>
        </Stack>
        {/* TODO */}
        {/* <Stack>
            <Text fontSize='sm' color='gray.500'>$19625</Text>
            <br />
          </Stack> */}
        <Spacer />
        <Stack>
          {/* TODO */}
          {/* <Button colorScheme='red' size='sm' onClick={onOpen}>{actionLabel}</Button> */}
          <Button variant='link' size='sm' onClick={() => onRemoveResource(resourceArn)}>
            {'Don\'t ' + actionTypeText[actionType]}
          </Button>
        </Stack>
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm {actionType}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>You are about to {actionType} the resource with id {resourceArn}.</Text>
            <Button
              colorScheme='red'
              size='sm'
              onClick={() => {
                onResourcesAction([resourceArn], actionType);
                onRemoveResource(resourceArn);
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