/* eslint-disable max-len */
import React, { useState } from 'react';
import {
  Box,
  Button, Checkbox, Flex, Heading, Spacer, Stack, Table, TableContainer, Tbody, Td, Th, Thead, Tooltip, Tr, Icon
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { TbRefresh } from 'react-icons/tb/index.js';

import isEmpty from 'lodash.isempty';
import ServiceTableRow from './service-table-row.js';
import { Utilization, actionTypeText, ActionType } from '../../types/types.js';
import { filterUtilizationForActionType, sentenceCase } from '../../utils/utilization.js';
import { RecommendationsTableProps } from '../../types/utilization-recommendations-types.js';
import { Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody } from '@chakra-ui/react';
import { ChevronDownIcon, InfoIcon, ExternalLinkIcon } from '@chakra-ui/icons';

export const CHECKBOX_CELL_MAX_WIDTH = '16px';
export const RESOURCE_PROPERTY_MAX_WIDTH = '100px';
const RESOURCE_VALUE_MAX_WIDTH = '170px';

export function RecommendationsTable (props: RecommendationsTableProps) {
  const { utilization, actionType, onRefresh, sessionHistory } = props;
  const [checkedResources, setCheckedResources] = useState<string[]>([]);
  const [checkedServices, setCheckedServices] = useState<string[]>([]);
  const [showSideModal, setShowSideModal] = useState<boolean | undefined>(undefined);
  const [ sidePanelResourceArn, setSidePanelResourceArn ] = useState<string | undefined>(undefined);
  const [ sidePanelService, setSidePanelService ] = useState<string | undefined>(undefined);

  const filteredServices = filterUtilizationForActionType(utilization, actionType, sessionHistory);

  // #region actions
  function onServiceCheckChange (serviceName: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        const cascadedCheckedResources = [...checkedResources];
        Object.keys(filteredServices[serviceName]).forEach((resArn) => {
          if (!cascadedCheckedResources.includes(resArn)) {
            cascadedCheckedResources.push(resArn);
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

  function onResourceCheckChange (resArn: string, serviceName: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setCheckedResources([...checkedResources, resArn]);
      } else {
        setCheckedServices(checkedServices.filter(s => s !== serviceName));
        setCheckedResources(checkedResources.filter(id => id !== resArn));
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
    const usd = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    const tableHeadersSet = new Set<string>();
    Object.keys(serviceUtil).forEach(resArn =>
      Object.keys(serviceUtil[resArn].scenarios).forEach(s => tableHeadersSet.add(s))
    );
    const tableHeaders = [...tableHeadersSet];
    const tableHeadersDom = actionType === ActionType.DELETE  ? [...tableHeaders].map(th =>
      <Th key={th} maxW={RESOURCE_VALUE_MAX_WIDTH} overflow='hidden'>
        {sentenceCase(th)}
      </Th>
    ): undefined;

    const taskRows = Object.keys(serviceUtil).map(resArn => (
      <Tr key={resArn}>
        <Td w={CHECKBOX_CELL_MAX_WIDTH}>
          <Checkbox
            isChecked={checkedResources.includes(resArn)}
            onChange={onResourceCheckChange(resArn, serviceName)}
          />
        </Td>
        <Td
          maxW={RESOURCE_PROPERTY_MAX_WIDTH}
          overflow='hidden'
          textOverflow='ellipsis'
        >
          {resArn}
        </Td>
        {tableHeaders.map(th => 
          <Td
            key={resArn + 'scenario' + th}
            maxW={RESOURCE_VALUE_MAX_WIDTH}
            overflow='hidden'
            textOverflow='ellipsis'
          >
            <Tooltip 
              label={serviceUtil[resArn].scenarios[th] ? serviceUtil[resArn].scenarios[th][actionType]?.reason : undefined } 
              aria-label='A tooltip'
              bg='purple.400'
              color='white'
            >
              <Box>
                {serviceUtil[resArn].scenarios[th]?.value || 'undefined'}
                {<InfoIcon marginLeft={'8px'} color='black' />}
              </Box>
            </Tooltip>            
          </Td>
        )}
        <Td
          key={resArn + 'cost/mo'}
          maxW={RESOURCE_PROPERTY_MAX_WIDTH}
          overflow='hidden'
          textOverflow='ellipsis'
        >
          { serviceUtil[resArn]?.data?.monthlyCost ?
            usd.format(serviceUtil[resArn].data.monthlyCost) :
            'Coming soon!'
          }
        </Td>
        <Td
          key={resArn + 'cost/hr'}
          maxW={RESOURCE_PROPERTY_MAX_WIDTH}
          overflow='hidden'
          textOverflow='ellipsis'
        >
          { serviceUtil[resArn]?.data?.hourlyCost ?
            usd.format(serviceUtil[resArn].data.hourlyCost) :
            'Coming soon!'
          }
        </Td>
        <Td> 
          <Button
            variant='link'
            onClick={ () => { 
              setShowSideModal(true);
              setSidePanelResourceArn(resArn);
              setSidePanelService(serviceName);
            }}
            size='sm'
            colorScheme='purple'
            fontWeight='1px'
          >
            {'Details'}
          </Button>
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
                <Th>Estimated Cost/Mo</Th>
                <Th>Estimated Cost/Hr</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>{actionType === ActionType.DELETE ? taskRows: taskRowsForOptimize(serviceName, serviceUtil)}</Tbody>
          </Table>
        </TableContainer>
      </Stack>
    );
  }

  function taskRowsForOptimize (serviceName: string, serviceUtil: Utilization<string>){
    const usd = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    
    const tableHeadersSet = new Set<string>();
    Object.keys(serviceUtil).forEach(resArn =>
      Object.keys(serviceUtil[resArn].scenarios).forEach(s => tableHeadersSet.add(s))
    );
    const tableHeaders = [...tableHeadersSet];
    
    return Object.keys(serviceUtil).map(resArn => (
      <>
        <Tr key={resArn}>
          <Td w={CHECKBOX_CELL_MAX_WIDTH}>
            <Checkbox
              isChecked={checkedResources.includes(resArn)}
              onChange={onResourceCheckChange(resArn, serviceName)} />
          </Td>
          <Td
            maxW={RESOURCE_PROPERTY_MAX_WIDTH}
            overflow='hidden'
            textOverflow='ellipsis'
          >
            {resArn}
          </Td>
          <Td
            key={resArn + 'cost/mo'}
            maxW={RESOURCE_PROPERTY_MAX_WIDTH}
            overflow='hidden'
            textOverflow='ellipsis'
          >
            {usd.format(serviceUtil[resArn].data.monthlyCost)}
          </Td>
          <Td
            key={resArn + 'cost/hr'}
            maxW={RESOURCE_PROPERTY_MAX_WIDTH}
            overflow='hidden'
            textOverflow='ellipsis'
          >
            {usd.format(serviceUtil[resArn].data.hourlyCost)}
          </Td>
          <Td
            maxW={RESOURCE_PROPERTY_MAX_WIDTH}
            overflow='hidden'
            textOverflow='ellipsis'
          >
            <Button
              variant='link'
              onClick={() => {
                setShowSideModal(true);
                setSidePanelResourceArn(resArn);
                setSidePanelService(serviceName);
              } }
              size='sm'
              colorScheme='purple'
              fontWeight='1px'
            >
              {'Details'}
            </Button>
          </Td>
        </Tr>
        <Tr>
          <Td colSpan={4}>
            <Stack key={'optimize-task-rows-table'}>
              <TableContainer
                border="1px"
                borderRadius="6px"
                borderColor="gray.100"
              >
                <Table size='sm'>
                  <Tbody>
                    {tableHeaders.map(th => 
                      serviceUtil[resArn].scenarios[th] && serviceUtil[resArn].scenarios[th][actionType]?.action && (
                        <Tr>
                          <Td w={CHECKBOX_CELL_MAX_WIDTH}>
                            { ( isEmpty(serviceUtil[resArn].scenarios[th][actionType]?.action) || !serviceUtil[resArn].scenarios[th][actionType]?.isActionable ) ?  <Checkbox isDisabled/> :  <Checkbox
                              isChecked={checkedResources.includes(resArn)}
                              onChange={onResourceCheckChange(resArn, serviceName)} /> }
                          </Td>
                          <Td
                            key={resArn + 'scenario' + th}
                          >
                            <Tooltip 
                              label={
                                'Estimated ' +
                                (serviceUtil[resArn].scenarios[th] ?
                                  usd.format(serviceUtil[resArn].scenarios[th][actionType]?.monthlySavings) :
                                  usd.format(0)) +
                                ' savings/mo'
                              } 
                              aria-label='A tooltip'
                              bg='purple.400'
                              color='white'
                            >
                              <Box>
                                { sentenceCase(serviceUtil[resArn].scenarios[th][actionType]?.action) }
                                {<InfoIcon marginLeft={'8px'} color='black' />}
                              </Box>
                            </Tooltip> 
                          </Td>
                        </Tr>
                      )
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </Stack>
          </Td>
        </Tr>
        
      </>
    ));
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

  function sidePanel (){ 
    const serviceUtil = sidePanelService && filteredServices[sidePanelService];
    const data = serviceUtil && serviceUtil[sidePanelResourceArn]?.data;

    const adjustments = serviceUtil && Object.keys(serviceUtil[sidePanelResourceArn]?.scenarios).map(scenario => (
      <Box bg="#EDF2F7" p={2} color="black" marginBottom='8px'> 
        <InfoIcon marginRight={'8px'} />
        {serviceUtil[sidePanelResourceArn].scenarios[scenario][actionType].reason} 
      </Box>
    ));

    return ( 
      <Drawer 
        isOpen={showSideModal} 
        onClose={() => {
          setShowSideModal(false);
        }}
        placement='right'
        size='xl'
      >
        <DrawerOverlay />
        <DrawerContent marginTop='50px'>
          <DrawerCloseButton />
          <DrawerHeader> 
            <Flex>
              <Box>
                <Heading fontSize='xl'> 
                  {sidePanelService}
                </Heading>
              </Box>
              <Spacer/>
              <Box marginRight='40px'>
                <Button 
                  colorScheme='orange'
                  size='sm' 
                  rightIcon={<ExternalLinkIcon />}
                  /*onClick={ () => { 
                    window.open(getAwsLink(sidePanelResourceArn, sidePanelService as AwsResourceType, data?.region));
                  }}*/
                > 
                  View in AWS 
                </Button>
              </Box>
            </Flex>
          </DrawerHeader>
          <DrawerBody>
            <TableContainer>
              <Table size='sm'>
                <Thead>
                  <Tr>
                    <Th 
                      maxW={'250px'}
                      overflow='hidden'
                      textOverflow='ellipsis'
                      textTransform='none'  
                    >
                      {data?.resourceId}
                    </Th>
                    <Th maxW={RESOURCE_PROPERTY_MAX_WIDTH} textTransform='none'> {data?.region}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td color='gray.500'>Resource ID</Td>
                    <Td color='gray.500'> Region </Td>
                  </Tr>
                </Tbody>
              </Table>
              <Box marginTop='20px'>
                <Button
                  variant='ghost'
                  aria-label={'downCaret'}
                  leftIcon={<ChevronDownIcon/>}
                  size='lg'
                  colorScheme='black'
                >
                  Adjustments
                </Button>
                {adjustments}
              </Box>
            </TableContainer>
            <Flex pt='1'>
              <Spacer/>
              <Spacer/>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Stack pt="3" pb="3" w="100%">
      <Flex pl='4' pr='4'>
        <Box>
          <Heading as='h4' size='md'>Review resources to {actionTypeText[actionType]}</Heading>
        </Box>
        <Button 
          colorScheme="purple"
          variant="outline"
          marginLeft={'8px'} 
          size='sm'
          border='0px'
          onClick={() => onRefresh()}
        >
          <Icon as={TbRefresh} />
        </Button>
        <Spacer />
        <Box>
          <Button colorScheme='gray' size='sm' marginRight={'8px'} onClick={() => props.onBack()}> 
            { <><ArrowBackIcon /> Back </> }
          </Button>
        </Box>
        <Box>
          <Button
            onClick={() => props.onContinue(checkedResources)}
            colorScheme='red'
            size='sm'
          >
            Continue
          </Button>
        </Box>
      </Flex>
      <Stack pb='2' w="100%">
        {table()}
      </Stack>
      {sidePanel()}
    </Stack>
  );

  // #endregion
}