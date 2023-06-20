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
import { ResourceCosts } from '../../types/cost-and-usage-types.js';
import { useTableHeaderSorting } from '../table-sorting.js';

type ResourceCostTableRow = {
  resourceId: string;
  cost: number;
}

type ResourcesTableProps = {
  service: string;
  resourceCosts: ResourceCosts;
};

export function ResourcesTable (props: ResourcesTableProps) {
  const { service, resourceCosts } = props;
  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  const tableData: ResourceCostTableRow[] = Object.keys(resourceCosts).map(resourceId => (
    {
      resourceId,
      cost: resourceCosts[resourceId]
    }
  ));

  const { sortDataTable, SortableTh } = useTableHeaderSorting(tableData, { column: 'cost', order: 'desc' });

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
              <SortableTh header='Resource ID' headerKey='resourceId'/>
              <SortableTh header='Cost/Mo' headerKey='cost'/>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {sortDataTable().map(row => (
              <Tr key={row['resourceId']}>
                <Td
                  maxW='500px'
                >
                  <Tooltip 
                    label={row['resourceId']}
                    placement='bottom-start'
                    aria-label='A tooltip'
                    bg='purple.400'
                    color='white'
                  >
                    <Box
                      overflow='hidden'
                      textOverflow='ellipsis'
                    >
                      {row['resourceId']}
                    </Box>
                  </Tooltip>    
                </Td>
                <Td>{usd.format(row['cost'])}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Stack>
  );
}