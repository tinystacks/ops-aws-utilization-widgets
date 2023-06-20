import React from 'react';
import {
  Button,
  Divider, 
  Heading, 
  HStack, 
  Menu, 
  MenuButton,
  MenuItem, 
  MenuList, 
  Stack, 
  Table, 
  TableContainer, 
  Tbody,
  Text, 
  Th, 
  Thead, 
  Tr
} from '@chakra-ui/react';
import isEmpty from 'lodash.isempty';
import { 
  AccountIdSelector,
  CostReport, 
  RegionSelector, 
  ServiceCostTableRow 
} from '../../types/cost-and-usage-types.js';
import { ServiceRow } from './service-row.js';
import { useTableHeaderSorting } from '../table-sorting.js';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { ServiceCostPerMonthGraph } from './service-cost-per-month-graph.js';

export default function ReportBreakdown (props: { 
  costReport: CostReport,
  useAccountIdSelector: AccountIdSelector,
  useRegionSelector: RegionSelector
}) {
  const { 
    costReport,
    useAccountIdSelector: {
      accountName: currentAccountName,
      accountIdMap,
      onAccountIdChange
    },
    useRegionSelector: {
      region: currentRegion,
      allRegions,
      onRegionChange
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
      headerMessage = 'All cost values below are monthly estimates based on current usage costs provided by AWS.';
    }
      
    const tableData = Object.keys(costReport.report).map(service => (
      {
        service,
        numResources: Object.keys(costReport.report[service].resourceCosts).length,
        cost: costReport.report[service].serviceCost
      }
    ));

    const { sortDataTable, SortableTh } = useTableHeaderSorting(tableData, { column: 'cost', order: 'desc' });

    return (
      <Stack>
        <HStack justify={'right'} spacing={4} pt={2} pr={6}>
          <Menu>
            <MenuButton p={4} as={Button} h={25} w={200} rightIcon={<ChevronDownIcon />}>
              <Text fontSize='xs'>
                <Text as='span' fontWeight={'bold'}>Account</Text>: {currentAccountName}
              </Text>
            </MenuButton>
            <MenuList h={150} w={200} overflowY='scroll'>
              {Object.keys(accountIdMap).map(accountName => (
                <MenuItem
                  onClick={() => onAccountIdChange(accountIdMap[accountName])}
                  fontSize='xs'
                >
                  {accountName}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Menu>
            <MenuButton p={4} as={Button} h={25} w={200} rightIcon={<ChevronDownIcon />}>
              <Text fontSize='xs'>
                <Text as='span' fontWeight={'bold'}>Region</Text>: {currentRegion}
              </Text>
            </MenuButton>
            <MenuList h={150} w={200} overflowY='scroll'>
              {allRegions.map(region => (
                <MenuItem
                  onClick={() => onRegionChange(region)}
                  fontSize='xs'
                >
                  {region}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </HStack>
        <Divider/>
        <ServiceCostPerMonthGraph 
          serviceCostsPerMonth={costReport.serviceCostsPerMonth} 
          monthLabels={costReport.monthLabels}
        />
        <Divider/>
        <Heading pt={2} pl={6} size='xs'>
          {headerMessage}
        </Heading>
        <TableContainer border="1px" borderColor="gray.100">
          <Table variant="simple">
            <Thead bgColor="gray.50">
              <Tr>
                <SortableTh header='Service' headerKey='service'/>
                <SortableTh header='# Resources' headerKey='numResources'/>
                <SortableTh header='Cost/Mo' headerKey='cost'/>
                <Th/>
              </Tr>
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