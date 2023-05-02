import React, { useState } from 'react';
import { Button, Checkbox, HStack, Heading, Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import isEmpty from 'lodash.isempty';
import ServiceTableRow from './service-table-row.js';
import { ActionType, AwsResourceType, Utilization, actionTypeText } from '../types/types.js';
import { filterUtilizationForActionType } from '../utils/utilization.js';

export function RecommendationsTableUi (props: {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  actionType: ActionType;
}) {
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
    const taskRows = Object.keys(serviceUtil).map(resId => (
      <Tr key={resId}>
        <Td>
          <Checkbox
            isChecked={checkedResources.includes(resId)}
            onChange={onResourceCheckChange(resId, serviceName)}
          />
        </Td>
        <Td>{resId}</Td>
        {Object.keys(serviceUtil[resId].scenarios).map(s => (
          <Td key={resId + 'scenario' + s}>{serviceUtil[resId].scenarios[s].value}</Td>
        ))}
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
                <Th></Th>
                <Th>Resource ID</Th>
                <Th>Size</Th>
                <Th>Last Changed</Th>
                <Th>30-Day Max CPU</Th>
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
            <Th></Th>
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
    <Stack pt="20px" pb="20px" w="100%">
      <HStack pl='2'>
        <Button
          as='a'
          href={`/confirm-recommendations?actionType=${actionType}&resourceIds=${checkedResources}`}
          colorScheme='red'
        >
          Continue
        </Button>
      </HStack>
      
      <Stack pt="20px" pb="20px" w="100%">
        <Heading as='h4' size='sm'>Review resources to {actionTypeText[actionType]}</Heading>
        {table()}
      </Stack>
    </Stack>
  );

  // #endregion
}