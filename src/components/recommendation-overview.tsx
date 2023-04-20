import React from 'react';
import { Box, Heading, Text, SimpleGrid } from '@chakra-ui/react';
import { Utilization } from '../types/types.js';

export default function RecommendationOverview (props: { utilizations: { [ serviceName: string ] : Utilization<string> } }) {

  const { utilizations } = props;

  const { totalRecommendations, totalUnusedResources, totalScalingActions } = getTotalRecommendationValues(utilizations);

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
        <Heading style={labelStyles}>{totalRecommendations}</Heading>
        <Text style={textStyles}>{'recommendations'}</Text>
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
  let totalRecommendations = 0;
  let totalUnusedResources = 0; 
  let totalScalingActions = 0;
  let totalOptimizeActions = 0;

  for(const service in utilizations) {
    const serviceUtilization = utilizations[service];
    for(const resource in serviceUtilization){
      const scenarios = serviceUtilization[resource].scenarios;
      for(const scenario in scenarios){ 
        if(scenarios[scenario].delete){ 
          ++totalUnusedResources; 
          ++totalRecommendations;
        }
        if(scenarios[scenario].scaleDown){ 
          ++totalScalingActions;
          ++totalRecommendations;
        }
        if(scenarios[scenario].optimize){ 
          ++totalOptimizeActions;
          ++totalRecommendations;
        }
      }
    }
  }

  return { 
    totalRecommendations, 
    totalUnusedResources, 
    totalScalingActions, 
    totalOptimizeActions
  };
}