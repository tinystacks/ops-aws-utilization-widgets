import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Button, HStack, Heading, Stack, Text, Box, useDisclosure, Input
} from '@chakra-ui/react';
import { ActionType } from '../types/types';
import { ConfirmSingleRecommendation } from './confirm-single-recommendation-ui.js';

export type ConfirmRecommendationsUiProps = {
  actionType: ActionType;
  resourceIds: string[];
};

export function ConfirmRecommendationsUi (props: ConfirmRecommendationsUiProps) {
  const { actionType, resourceIds } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [confirmationText, setConfirmationText] = useState<string>('');
  const actionLabel = actionType.charAt(0).toUpperCase() + actionType.slice(1) + ' now';
  const resourceActions = resourceIds.map(rid => (
    <ConfirmSingleRecommendation
      resourceId={rid}
      actionType={actionType}
    />
  ));
  return (
    <Stack>
      <HStack>
        <Heading as='h5' size='sm'>Automatically {actionType}</Heading>
        <Button colorScheme='red' size='sm' onClick={onOpen}>{actionLabel} all</Button>
      </HStack>
      <Box>
        {resourceActions}
      </Box>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm {actionType}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>You are about to {actionType} {resourceIds.length} resources.</Text>
            <Text>To confirm, type '{actionLabel} resources' in the input below.</Text>
            <Text as='b'>Confirm {actionType}</Text>
            <HStack>
              <Input value={confirmationText} onChange={event => setConfirmationText(event.target.value)} />
              <Button colorScheme='red' size='sm'>{actionLabel}</Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Stack>
  );
}