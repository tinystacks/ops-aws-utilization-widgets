import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Button, HStack, Heading, Stack, Text, Box, useDisclosure, Input, AlertTitle, AlertIcon, Alert
} from '@chakra-ui/react';
import { ConfirmSingleRecommendation } from './confirm-single-recommendation.js';
import { ConfirmRecommendationsProps } from '../utilization-recommendations-types.js';
import { actionTypeText } from '../../types/types.js';

export function ConfirmRecommendations (props: ConfirmRecommendationsProps) {
  const { actionType, resourceIds, onRemoveResource, onResourcesAction } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [confirmationText, setConfirmationText] = useState<string>('');
  const [error, setError] = useState<string | undefined>(undefined);
  const actionLabel = actionTypeText[actionType];
  const resourceActions = resourceIds.map(rid => (
    <ConfirmSingleRecommendation
      resourceId={rid}
      actionType={actionType}
      onRemoveResource={onRemoveResource}
      onResourcesAction={onResourcesAction}
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
      <Modal isOpen={isOpen} onClose={() => {
        setError(undefined);
        setConfirmationText(undefined);
        onClose();
      }}>
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
              <Button
                colorScheme='red'
                size='sm'
                onClick={() => {
                  if (confirmationText !== actionLabel + ' resources') {
                    setError(`Type '${actionLabel} resources' in the box to continue`);
                  } else {
                    setError(undefined);
                    onResourcesAction(resourceIds, actionType);
                  }
                }}
              >
                {actionLabel}
              </Button>
            </HStack>
            <Alert status='error' hidden={!error}>
              <AlertIcon />
              <AlertTitle>{error}</AlertTitle>
            </Alert>  
          </ModalBody>
        </ModalContent>
      </Modal>
    </Stack>
  );
}