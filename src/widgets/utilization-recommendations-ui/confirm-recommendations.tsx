import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Button, HStack, Heading, Stack, Text, Box, useDisclosure, Input
} from '@chakra-ui/react';
import { ConfirmSingleRecommendation } from './confirm-single-recommendation.js';
import { ConfirmRecommendationsProps } from '../utilization-recommendations-types.js';

export function ConfirmRecommendations (props: ConfirmRecommendationsProps) {
  const { actionType, resourceIds, onRemoveResource } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [confirmationText, setConfirmationText] = useState<string>('');
  const actionLabel = actionType.charAt(0).toUpperCase() + actionType.slice(1);
  const resourceActions = resourceIds.map(rid => (
    <ConfirmSingleRecommendation
      resourceId={rid}
      actionType={actionType}
      onRemoveResource={onRemoveResource}
    />
  ));
  return (
    <Stack p="20px" w="100%">
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