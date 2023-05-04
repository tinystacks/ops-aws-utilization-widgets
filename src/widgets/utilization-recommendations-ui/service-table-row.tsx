import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import {
  Tr,
  Td,
  Button,
  useDisclosure,
  Checkbox
} from '@chakra-ui/react';
import React from 'react';
import { ServiceTableRowProps } from '../utilization-recommendations-types.js';

export default function ServiceTableRow (props: ServiceTableRowProps) {
  const { serviceUtil, serviceName, children, isChecked, onServiceCheckChange } = props;
  const { isOpen, onToggle } = useDisclosure();
  return (
    <React.Fragment>
      <Tr key={serviceName}>
        <Td>
          <Checkbox 
            isChecked={isChecked}
            onChange={onServiceCheckChange}
          />
        </Td>
        <Td>{serviceName}</Td>
        <Td>{Object.keys(serviceUtil).length}</Td>
        <Td>
          <Button
            variant='link'
            onClick={onToggle}
            aria-label={isOpen ? 'upCaret' : 'downCaret'}
            rightIcon={isOpen ? <ChevronUpIcon />: <ChevronDownIcon/>}
            size='sm'
            colorScheme='purple'
            fontWeight='1px'
          >
            {isOpen ? 'Hide resources' : 'Show resources'}
          </Button>
        </Td>
      </Tr>
      <Tr hidden={!isOpen}>
        <Td colSpan={4}>
          {children}
        </Td>
      </Tr>
    </React.Fragment>
  );
}