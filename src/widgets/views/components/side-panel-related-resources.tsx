import {
  Box,
  Button,
  Spacer,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import React from 'react';
import { Data } from '../../../types/types';
import isEmpty from 'lodash.isempty';
import { ChevronDownIcon } from '@chakra-ui/icons';


export default function SidePanelRelatedResources (props: { 
  data: Data
}) {


  const { data } = props; 

  if(isEmpty(data)){ 
    return null;
  }

  if(isEmpty(data.associatedResourceId) && isEmpty(data.tags)){
    return null;
  }

  const relatedResourcesSection = data.associatedResourceId ? 
    <Box marginTop='20px'>
      <Button
        variant='ghost'
        aria-label={'downCaret'}
        leftIcon={<ChevronDownIcon/>}
        size='lg'
        colorScheme='black'
      >
         Related Resources
      </Button>
      <Spacer/>
      <Table size='sm' marginTop='12px'>
        <Thead>
          <Tr>
            <Th 
              maxW={'250px'}
              overflow='hidden'
              textOverflow='ellipsis'
              textTransform='none'  
            >
              { 'Related Resource ID' }
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td color='gray.500'>  { data?.associatedResourceId }</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box> : null;


  const tags = data.tags?.map( tag => (
    <Tr>
      <Td color='gray.500'>  {tag.Key}</Td>
      <Td color='gray.500'>  {tag.Value}</Td>
    </Tr>
  ));

  const tagsSection = data.tags ? 
    <Box marginTop='20px'>
      <Button
        variant='ghost'
        aria-label={'downCaret'}
        leftIcon={<ChevronDownIcon/>}
        size='lg'
        colorScheme='black'
      >
     Tags
      </Button>
      <Spacer/>
      <Table size='sm' marginTop='12px'>
        <Thead>
          <Tr>
            <Th 
              maxW={'250px'}
              overflow='hidden'
              textOverflow='ellipsis'
              textTransform='none'  
            >
              { 'Key' }
            </Th>
            <Th 
              maxW={'250px'}
              overflow='hidden'
              textOverflow='ellipsis'
              textTransform='none'  
            >
              { 'Value' }
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {tags}
        </Tbody>
      </Table>
    </Box> : null;

  return ( 
    <Stack>
      {relatedResourcesSection}
      {tagsSection}
    </Stack>
  );
  
}