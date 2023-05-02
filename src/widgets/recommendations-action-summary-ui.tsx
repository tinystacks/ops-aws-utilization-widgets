import React from 'react';
import { Box, Button, Flex, Heading, Icon, Spacer, Stack, Text } from '@chakra-ui/react';
import { DeleteIcon, ArrowForwardIcon, ArrowDownIcon } from '@chakra-ui/icons';
import { TbVectorBezier2 } from 'react-icons/tb/index.js';
import { filterUtilizationForActionType } from '../utils/utilization.js';
import { ActionType, AwsResourceType, Utilization } from '../types/types.js';

export type RecommendationsActionSummaryUiProps = {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  deleteLink: string;
  optimizeLink: string;
  scaleDownLink: string;
};

export function RecommendationsActionSummaryUi (props: RecommendationsActionSummaryUiProps) {
  const { utilization, deleteLink, optimizeLink, scaleDownLink } = props;
  const deleteChanges = filterUtilizationForActionType(utilization, ActionType.DELETE);
  const scaleDownChanges = filterUtilizationForActionType(utilization, ActionType.SCALE_DOWN);
  const optimizeChanges = filterUtilizationForActionType(utilization, ActionType.OPTIMIZE);

  function actionSummaryStack (icon: JSX.Element, actionLabel: string, numResources: number, link: string, description: string) {
    return (
      <Stack w="100%" p=''>
        <Flex>
          <Box w='20px'>
            {icon}
          </Box>
          <Box w='450px'>
            <Heading as='h5' size='sm'>{actionLabel}</Heading>
          </Box>
          <Box w='150px'>
            <Text fontSize='sm' color='gray.500'>{numResources} available</Text>
          </Box>
          <Spacer />
          <Button colorScheme='purple' size='sm' as='a' href={'/' + link}>Review <ArrowForwardIcon /></Button>
        </Flex>
        <Text fontSize='sm' color='gray.500' pl='29px'>{description}</Text>
      </Stack>
    );
  }

  return (
    <Stack pt="20px" pb="20px" w="100%">
      {actionSummaryStack(<DeleteIcon color='gray' />, 'Delete', Object.keys(deleteChanges).length, deleteLink, 'Resources that have had no recent activity.')}
      <hr />
      {actionSummaryStack(<ArrowDownIcon color='gray' />, 'Scale Down', Object.keys(scaleDownChanges).length, scaleDownLink, 'Resources are recently underutilized.')}
      <hr />
      {actionSummaryStack(<Icon as={TbVectorBezier2} color='gray' />, 'Optimize', Object.keys(optimizeChanges).length, optimizeLink, 'Resources that would be more cost effective using an AWS optimization tool.')}
    </Stack>
  );
}