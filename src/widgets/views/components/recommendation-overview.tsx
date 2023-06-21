import React from 'react';
import { Box, Heading, Text, SimpleGrid } from '@chakra-ui/react';
import { ActionType, HistoryEvent, Utilization } from '../../../types/index.js';
import { filterUtilizationForActionType, 
  getNumberOfResourcesFromFilteredActions, 
  getTotalMonthlySavings, 
  getTotalNumberOfResources } from '../../../utils/index.js';

export default function RecommendationOverview (
  props: { utilizations: { [ serviceName: string ] : Utilization<string> }, sessionHistory: HistoryEvent[] }
) {

  const { utilizations, sessionHistory } = props;

  const { totalUnusedResources, totalMonthlySavings, totalResources } =
    getTotalRecommendationValues(utilizations, sessionHistory);

  const labelStyles = {
    fontFamily: 'Inter',
    fontSize: '42px',
    fontWeight: '400', 
    lineHeight: '150%', 
    color: '#000000'
  };

  const textStyles = {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: '500', 
    lineHeight: '150%', 
    color: 'rgba(0, 0, 0, 0.48)'
  };


  return (
    <SimpleGrid columns={3} spacing={2}>
      <Box p={5}>
        <Heading style={labelStyles}>{totalResources}</Heading>
        <Text style={textStyles}>{'resources'}</Text>
      </Box>
      <Box p={5}>
        <Heading style={labelStyles}>{totalUnusedResources}</Heading>
        <Text style={textStyles}>{'unused resources'}</Text>
      </Box>
      <Box p={5}>
        <Heading style={labelStyles}>{ totalMonthlySavings }</Heading>
        <Text style={textStyles}>{'potential monthly savings'}</Text>
      </Box>
    </SimpleGrid>
  );


}

function getTotalRecommendationValues (
  utilizations:  { [ serviceName: string ] : Utilization<string> },
  sessionHistory: HistoryEvent[]
) { 
  const deleteChanges = filterUtilizationForActionType(utilizations, ActionType.DELETE, sessionHistory);
  const totalUnusedResources = getNumberOfResourcesFromFilteredActions(deleteChanges);
  const totalResources = getTotalNumberOfResources(utilizations);
  const totalMonthlySavings = getTotalMonthlySavings(utilizations);

  return { 
    totalUnusedResources, 
    totalMonthlySavings, 
    totalResources
  };
}