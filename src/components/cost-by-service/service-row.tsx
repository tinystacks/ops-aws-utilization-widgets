import React from 'react';
import { ChevronUpIcon, ChevronDownIcon, InfoIcon } from '@chakra-ui/icons';
import { useDisclosure, Tr, Td, Button, Box, Tooltip } from '@chakra-ui/react';
import { ServiceInformation } from '../../types/cost-and-usage-types.js';
import isEmpty from 'lodash.isempty';
import ResourcesTable from './resources-table.js';

type ServiceRowProps = {
  service: string;
  serviceInformation: ServiceInformation;
};

export default function ServiceRow (props: ServiceRowProps) {
  const {
    service,
    serviceInformation: { serviceCost, resourceCosts, details }
  } = props;
  const { isOpen, onToggle } = useDisclosure();

  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  return (
    <React.Fragment>
      <Tr key={service}>
        <Td>
          {details ? (
            <Tooltip
              label={details}
              aria-label='A tooltip'
              bg='purple.400'
              color='white'
            >
              <Box>
                {service}
                {<InfoIcon marginLeft={'8px'} color='black' />}
              </Box>
            </Tooltip>
          ) : (
            service
          )}
        </Td>
        <Td>{Object.keys(resourceCosts).length}</Td>
        <Td>{usd.format(serviceCost)}</Td>
        <Td>
          <Button
            variant='link'
            onClick={onToggle}
            aria-label={isOpen ? 'upCaret' : 'downCaret'}
            rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
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
          {isEmpty(resourceCosts) ? (
            'No resources found for this service'
          ) : (
            <ResourcesTable service={service} resourceCosts={resourceCosts} />
          )}
        </Td>
      </Tr>
    </React.Fragment>
  );
}