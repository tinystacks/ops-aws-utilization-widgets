import React from 'react';
import { Box, Heading, Text, SimpleGrid } from '@chakra-ui/react';
import { ActionType, Utilization } from '../types/types.js';
import { filterUtilizationForActionType, 
  getNumberOfResourcesFromFilteredActions, 
  getTotalNumberOfResources } from '../utils/utilization.js';

export default function RecommendationOverview (
  props: { utilizations: { [ serviceName: string ] : Utilization<string> } }
) {

  const { utilizations } = props;

  const { totalUnusedResources, totalScalingActions, totalResources } =
    getTotalRecommendationValues(utilizations);

  const labelStyles = {
    fontFamily: 'monospace',
    fontSize: '42px',
    fontWeight: '500', 
    lineHeight: '150%'
  };

  const textStyles = {
    fontFamily: 'monospace',
    fontSize: '15px',
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
        <Heading style={labelStyles}>{totalScalingActions}</Heading>
        <Text style={textStyles}>{'scaling actions'}</Text>
      </Box>
    </SimpleGrid>
  );


}

function getTotalRecommendationValues (utilizations:  { [ serviceName: string ] : Utilization<string> }) { 
  const deleteChanges = filterUtilizationForActionType(utilizations, ActionType.DELETE);
  const scaleDownChanges = filterUtilizationForActionType(utilizations, ActionType.SCALE_DOWN);

  const totalUnusedResources = getNumberOfResourcesFromFilteredActions(deleteChanges);
  const totalScalingActions = getNumberOfResourcesFromFilteredActions(scaleDownChanges);

  const totalResources = getTotalNumberOfResources(utilizations);

  return { 
    totalUnusedResources, 
    totalScalingActions, 
    totalResources
  };
}