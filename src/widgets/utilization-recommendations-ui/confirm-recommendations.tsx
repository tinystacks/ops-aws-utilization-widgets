import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Button, HStack, Heading, Stack, Text, Box, useDisclosure, Input, AlertTitle, AlertIcon, Alert, Spacer, Flex
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { ConfirmSingleRecommendation } from './confirm-single-recommendation.js';
import { ConfirmRecommendationsProps } from '../../types/utilization-recommendations-types.js';
import { actionTypeText } from '../../types/types.js';
import { filterUtilizationForActionType } from '../../utils/utilization.js';

export function ConfirmRecommendations (props: ConfirmRecommendationsProps) {
  const { actionType, resourceArns, onRemoveResource, onResourcesAction, utilization, sessionHistory } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [confirmationText, setConfirmationText] = useState<string>('');
  const [error, setError] = useState<string | undefined>(undefined);
  const actionLabel = actionTypeText[actionType].charAt(0).toUpperCase() + actionTypeText[actionType].slice(1);
  
  const filteredServices = filterUtilizationForActionType(utilization, actionType, sessionHistory);
  const resourceFilteredServices = new Set<string>();
  Object.entries(filteredServices).forEach(([serviceName, serviceUtil]) => {
    for (const resourceArn of resourceArns) {
      if (Object.hasOwn(serviceUtil, resourceArn)) {
        resourceFilteredServices.add(serviceName);
        break;
      }
    }
  });

  const resourceFilteredServiceTables = [...resourceFilteredServices].map((s) => {
    return (
      <Box borderRadius='6px' key={s} mb='3'>
        <HStack bgColor='gray.50' p='1'>
          <Text fontSize='sm'>{s}</Text>
        </HStack>
        <Stack pl='5' pr='5'>
          {resourceArns
            .filter(r => Object.hasOwn(filteredServices[s], r))
            .map(rarn => (
              <ConfirmSingleRecommendation
                resourceArn={rarn}
                actionType={actionType}
                onRemoveResource={onRemoveResource}
                onResourcesAction={onResourcesAction}
              />
            ))}
        </Stack>
      </Box>
    );
  });

  return (
    <Stack p="20px" w="100%">
      <Flex>
        <Stack>
          <Heading as='h4' size='md'>Delete Unused Resources</Heading>
          <Text color='gray.500'>
            These resources are underutilized and can likely be safely deleted.
            Remove any resources you would like to save and continue to delete all remaining resources. 
            Deleting resources may take a while after the button is clicked, and you may see the same recommendation
            for a while as AWS takes some time to delete resources.
          </Text>
        </Stack>
        <Spacer />
        <Box>
          <Button colorScheme='gray' size='sm' marginRight={'8px'} onClick={() => props.onBack()}> 
            { <><ArrowBackIcon /> Back </> } 
          </Button>
        </Box>
        <Box>
          <Button colorScheme='red' size='sm' onClick={onOpen}>{actionLabel} all</Button>
        </Box>
      </Flex>
      <hr />
      <Box>
        {resourceFilteredServiceTables}
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
            <Text fontSize='xl'>You are about to {actionType} {resourceArns.length} resources.</Text>
            <Text fontSize='xl'>To confirm, type '{actionType} resources' in the input below.</Text>
            <Text fontSize='xs'> 
              Please note, as we are cleaning up your resources they 
              may still appear as recommendations until the process completes in the background.
            </Text>
            <Text pt='1'>Confirm {actionType}</Text>
            <HStack>
              <Input value={confirmationText} onChange={event => setConfirmationText(event.target.value)} />
            </HStack>
            <Flex pt='1'>
              <Spacer/>
              <Box>
                <Button
                  colorScheme='red'
                  size='sm'
                  onClick={() => {
                    if (confirmationText !== actionType + ' resources') {
                      setError(`Type '${actionType} resources' in the box to continue`);
                    } else {
                      setError(undefined);
                      onResourcesAction(resourceArns, actionType);
                    }
                  }}
                >
                  {actionLabel}
                </Button>
              </Box>
            </Flex>
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