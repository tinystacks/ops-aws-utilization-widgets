/* eslint-disable max-len */
import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Button, Text, Box, useDisclosure, Spacer, Flex
} from '@chakra-ui/react';
 

export function RecommendationsInProgress (props: { isOpen: boolean | undefined }) {
  
  const { isOpen } = props;
  const { onClose } = useDisclosure();
  //console.error("expecting a popupp: ", isOpen);

  return ( 
    isOpen &&
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader> We are working on your actions</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text> 
            { 'Please note it may take a while for changes to apply and you may continue to see old resources while that\'s happening' }
          </Text>
          <Flex pt='1'>
            <Spacer/>
            <Box>
              <Button
                colorScheme='blue'
                size='sm'
                onClick={() => {
                  onClose();
                }}
              >
                  Close
              </Button>
            </Box>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}