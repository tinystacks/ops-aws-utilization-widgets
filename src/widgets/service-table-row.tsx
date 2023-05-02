import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import {
  Tr,
  Td,
  Button,
  useDisclosure,
  Checkbox
} from '@chakra-ui/react';
import React from 'react';
import { Utilization } from '../types/types';

export default function ServiceTableRow (props: {
  serviceUtil: Utilization<string>;
  serviceName: string;
  children?: React.ReactNode;
  onServiceCheckChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isChecked: boolean;
}) {
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
          >
            More Details
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