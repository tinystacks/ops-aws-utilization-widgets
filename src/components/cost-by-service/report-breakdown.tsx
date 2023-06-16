import React from 'react';
import { 
  Button, 
  Heading, 
  Menu, 
  MenuButton,
  MenuItem, 
  MenuList, 
  Stack, 
  Table, 
  TableContainer, 
  Tbody, 
  Th, 
  Thead 
} from '@chakra-ui/react';
import isEmpty from 'lodash.isempty';
import { AccountIdSelector, CostReport, ServiceCostTableRow } from '../../types/cost-and-usage-types.js';
import { ServiceRow } from './service-row.js';
import { useTableHeaderSorting } from './table-sorting.js';
import { ChevronDownIcon } from '@chakra-ui/icons';

export default function ReportBreakdown (props: { 
  costReport: CostReport,
  useAccountIdSelector: AccountIdSelector
}) {
  const { 
    costReport,
    useAccountIdSelector: {
      accountId: currentAccountId,
      allAccountIds,
      onAccountIdChange
    }
  } = props;

  function serviceRow (row: ServiceCostTableRow) {
    return (
      <ServiceRow 
        row={row} 
        resourceCosts={costReport.report[row['service']].resourceCosts}
        details={costReport.report[row['service']].details || ''}
      />
    );
  }

  function reportTable () {
    let headerMessage = '';
    if (isEmpty(costReport.report) && costReport.hasCostReportDefinition) {
      if (costReport.hasCostReport) {
        headerMessage = 
          'No cost report available for this account! ' +
          'This account may not be utilizing any AWS services this month ' +
          'or you may not have permissions to access it\'s cost details.';
      } else {
        headerMessage = 
          'No cost report available! ' +
          'If you have recently created an AWS Cost and Usage Report, it will be available in 24 hours.';
      }
    } else if (!costReport.hasCostReportDefinition) {
      headerMessage = 
        'You need to set up an AWS Cost and Usage Report under Billing in the AWS Console. ' +
        'It only takes a couple minutes, and a report will be available in 24 hours!';
    } else {
      headerMessage = 'All cost values are monthly estimates based on current usage costs provided by AWS.';
    }
      
    const tableData = Object.keys(costReport.report).map(service => (
      {
        service,
        numResources: Object.keys(costReport.report[service].resourceCosts).length,
        cost: costReport.report[service].serviceCost
      }
    ));

    const { handleHeaderClick, sortDataTable } = useTableHeaderSorting(tableData, { column: 'cost', order: 'desc' });

    return (
      <Stack>
        <Heading pt={2} pl={6} size='xs'>
          {headerMessage}
        </Heading>
        <Stack width="20%" pt={1} pb={3} px={4} align='baseline'>
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
              Account ID
            </MenuButton>
            <MenuList minW="0" w={250} h={40} sx={{ overflow:'scroll' }}>
              {allAccountIds.map((accountId) => {
                if (accountId === currentAccountId) {
                  return (
                    <MenuItem 
                      command={'current'} 
                      onClick={() => onAccountIdChange(accountId)}
                    >
                      {accountId}
                    </MenuItem>
                  );
                } else {
                  return <MenuItem onClick={() => onAccountIdChange(accountId)}>{accountId}</MenuItem>;
                }
              })}
            </MenuList>
          </Menu>
        </Stack>
        <TableContainer border="1px" borderColor="gray.100">
          <Table variant="simple">
            <Thead bgColor="gray.50">
              <Th onClick={() => handleHeaderClick('service')}>Service</Th>
              <Th onClick={() => handleHeaderClick('numResources')}># Resources</Th>
              <Th onClick={() => handleHeaderClick('cost')}>Cost/Mo</Th>
              <Th/>
            </Thead>
            <Tbody>
              {sortDataTable().map((serviceRow))}
            </Tbody>
          </Table>
        </TableContainer>
      </Stack>
    );
  }

  return (
    <Stack pb='2' w="100%">
      {reportTable()}
    </Stack>
  );
}