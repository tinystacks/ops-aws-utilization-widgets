import React from 'react';
import {
  Stack,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Tooltip,
  Box
} from '@chakra-ui/react';

type ResourcesTableProps = {
  service: string;
  resourceCosts: { [resourceId: string]: number };
};

export default function ResourcesTable (props: ResourcesTableProps) {
  const { service, resourceCosts } = props;

  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  return (
    <Stack key={service + 'resource-table'} maxHeight='500px'>
      <TableContainer
        border='1px'
        borderRadius='6px'
        borderColor='gray.100'
        overflowY='auto'
      >
        <Table variant='simple'>
          <Thead bgColor='gray.50'>
            <Tr>
              <Th>Resource ID</Th>
              <Th>Cost/Mo</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {Object.keys(resourceCosts)
              .sort()
              .map((resourceId) => {
                return (
                  <Tr key={resourceId}>
                    <Td
                      maxW='500px'
                    >
                      <Tooltip 
                        label={resourceId}
                        placement='bottom-start'
                        aria-label='A tooltip'
                        bg='purple.400'
                        color='white'
                      >
                        <Box
                          overflow='hidden'
                          textOverflow='ellipsis'
                        >
                          {resourceId}
                        </Box>
                      </Tooltip>    
                    </Td>
                    <Td>{usd.format(resourceCosts[resourceId])}</Td>
                  </Tr>
                );
              })}
          </Tbody>
        </Table>
      </TableContainer>
    </Stack>
  );
}