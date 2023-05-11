import React, { useState } from 'react';
import {
  Box,
  Button, Checkbox, Flex, Heading, Spacer, Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tr
} from '@chakra-ui/react';
import isEmpty from 'lodash.isempty';
import ServiceTableRow from './service-table-row.js';
import { Utilization, actionTypeText } from '../../types/types.js';
import { filterUtilizationForActionType } from '../../utils/utilization.js';
import { RecommendationsTableProps } from '../utilization-recommendations-types.js';

export const CHECKBOX_CELL_MAX_WIDTH = '16px';
export const RESOURCE_PROPERTY_MAX_WIDTH = '100px';

export function RecommendationsTable (props: RecommendationsTableProps) {
  const { utilization, actionType } = props;
  const [checkedResources, setCheckedResources] = useState<string[]>([]);
  const [checkedServices, setCheckedServices] = useState<string[]>([]);

  const filteredServices = filterUtilizationForActionType(utilization, actionType);

  // #region actions
  function onServiceCheckChange (serviceName: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        const cascadedCheckedResources = [...checkedResources];
        Object.keys(filteredServices[serviceName]).forEach((resId) => {
          if (!cascadedCheckedResources.includes(resId)) {
            cascadedCheckedResources.push(resId);
          }
        });
        setCheckedResources(cascadedCheckedResources);
        setCheckedServices([...checkedServices, serviceName]);
      } else {
        setCheckedServices(checkedServices.filter(s => s !== serviceName));
        setCheckedResources(checkedResources.filter(id => !filteredServices[serviceName][id]));
      }
    };
  }

  function onResourceCheckChange (resId: string, serviceName: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setCheckedResources([...checkedResources, resId]);
      } else {
        setCheckedServices(checkedServices.filter(s => s !== serviceName));
        setCheckedResources(checkedResources.filter(id => id !== resId));
      }
    };
  }

  // #endregion

  // #region render
  function serviceTableRow (service: string) {
    const serviceUtil = filteredServices[service];
    if (!serviceUtil || isEmpty(serviceUtil)) {
      return <></>;
    }
      
    return (
      <ServiceTableRow
        serviceName={service}
        serviceUtil={serviceUtil}
        children={resourcesTable(service, serviceUtil)}
        key={service + 'table'}
        onServiceCheckChange={onServiceCheckChange(service)}
        isChecked={checkedServices.includes(service)}
      />
    );
  }

  function resourcesTable (serviceName: string, serviceUtil: Utilization<string>) {
    const tableHeadersSet = new Set<string>();
    Object.keys(serviceUtil).forEach(resId =>
      Object.keys(serviceUtil[resId].scenarios).forEach(s => tableHeadersSet.add(s))
    );
    const tableHeaders = [...tableHeadersSet];
    const tableHeadersDom = [...tableHeaders].map(th =>
      <Th key={th} maxW={RESOURCE_PROPERTY_MAX_WIDTH}>
        {th}
      </Th>
    );
    console.log('servficeUtil', serviceUtil);

    const taskRows = Object.keys(serviceUtil).map(resId => (
      <Tr key={resId}>
        <Td w={CHECKBOX_CELL_MAX_WIDTH}>
          <Checkbox
            isChecked={checkedResources.includes(resId)}
            onChange={onResourceCheckChange(resId, serviceName)}
          />
        </Td>
        <Td
          maxW={RESOURCE_PROPERTY_MAX_WIDTH}
          overflow='hidden'
          textOverflow='ellipsis'
        >
          {resId}
        </Td>
        {tableHeaders.map(th => 
          <Td
            key={resId + 'scenario' + th}
            maxW={RESOURCE_PROPERTY_MAX_WIDTH}
            overflow='hidden'
            textOverflow='ellipsis'
          >
            {serviceUtil[resId].scenarios[th]?.value}
          </Td>
        )}
        <Td
          key={resId + 'cost/mo'}
          maxW={RESOURCE_PROPERTY_MAX_WIDTH}
          overflow='hidden'
          textOverflow='ellipsis'
        >
          {serviceUtil[resId].data.monthlyCost}
        </Td>
      </Tr>
    ));
    
    return (
      <Stack key={serviceName + 'resource-table'}>
        <TableContainer
          border="1px"
          borderRadius="6px"
          borderColor="gray.100"
        >
          <Table variant="simple">
            <Thead bgColor="gray.50">
              <Tr>
                <Th w={CHECKBOX_CELL_MAX_WIDTH}></Th>
                <Th>Resource ID</Th>
                {tableHeadersDom}
                <Th>Cost/Mo</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>{taskRows}</Tbody>
          </Table>
        </TableContainer>
      </Stack>
    );
  }

  function table () {
    if (!utilization || isEmpty(utilization)) {
      return <>No recommendations available!</>;
    }
    return (
      <TableContainer border="1px" borderColor="gray.100">
        <Table variant="simple">
          <Thead bgColor="gray.50">
            <Th w={CHECKBOX_CELL_MAX_WIDTH}></Th>
            <Th>Service</Th>
            <Th># Resources</Th>
            <Th>Details</Th>
          </Thead>
          <Tbody>
            {Object.keys(utilization).map(serviceTableRow)}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Stack pt="3" pb="3" w="100%">
      <Flex pl='4' pr='4'>
        <Box>
          <Heading as='h4' size='md'>Review resources to {actionTypeText[actionType]}</Heading>
        </Box>
        <Spacer />
        <Box>
          <Button
            onClick={() => props.onContinue(checkedResources)}
            colorScheme='red'
          >
            Continue
          </Button>
        </Box>
      </Flex>
      <Stack pb='2' w="100%">
        {table()}
      </Stack>
    </Stack>
  );

  // #endregion
}