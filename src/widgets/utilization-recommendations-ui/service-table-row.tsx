import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import {
  Tr,
  Td,
  Button,
  useDisclosure,
  Checkbox
} from '@chakra-ui/react';
import React from 'react';
import { ServiceTableRowProps } from '../../types/utilization-recommendations-types.js';
import { CHECKBOX_CELL_MAX_WIDTH } from './recommendations-table.js';
import { splitServiceName } from '../../utils/utilization.js';

export default function ServiceTableRow (props: ServiceTableRowProps) {
  const { serviceUtil, serviceName, children, isChecked, onServiceCheckChange } = props;
  const { isOpen, onToggle } = useDisclosure();
  return (
    <React.Fragment>
      <Tr key={serviceName}>
        <Td w={CHECKBOX_CELL_MAX_WIDTH}>
          <Checkbox 
            isChecked={isChecked}
            onChange={onServiceCheckChange}
          />
        </Td>
        <Td>{splitServiceName(serviceName)}</Td>
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