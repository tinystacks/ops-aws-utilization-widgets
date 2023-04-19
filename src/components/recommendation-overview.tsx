import { Stack, Box, Heading, Text } from '@chakra-ui/react';
import { Utilization } from '../types/types';

export default function RecommendationOverview (props: { utilizations: { [ serviceName: string ] : Utilization<string> } }) {

  const { utilizations } = props;

  let totalRecommendations = 0;
  let totalUnusedResources = 0; 
  let totalScalingActions = 0;

  for(const service in utilizations) {
    const serviceUtilization = utilizations[service];
    for(const resource in serviceUtilization){
      const scenarios = serviceUtilization[resource].scenarios;
      if(scenarios){ 
        ++totalRecommendations; 
      }
      if(scenarios['delete']){ 
        ++totalUnusedResources; 
      } 
      if(scenarios['scaleDown']){ 
        ++totalScalingActions;
      }
    }
  }


  return (

    <Stack direction='row' style={{ width: '100%' }}>
      <Box p={5} shadow='md' borderWidth='1px'>
        <Heading fontSize='xl'>{totalRecommendations}</Heading>
        <Text mt={4}>{'recommendations'}</Text>
      </Box>
      <Box p={5} shadow='md' borderWidth='1px'>
        <Heading fontSize='xl'>{totalUnusedResources}</Heading>
        <Text mt={4}>{'totalUnusedResources'}</Text>
      </Box>
      <Box p={5} shadow='md' borderWidth='1px'>
        <Heading fontSize='xl'>{totalScalingActions}</Heading>
        <Text mt={4}>{'totalScalingActions'}</Text>
      </Box>
    </Stack>
  );


}