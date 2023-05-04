import React from 'react';
import { Box, Button, Flex, Heading, Icon, Spacer, Stack, Text } from '@chakra-ui/react';
import { DeleteIcon, ArrowForwardIcon, ArrowDownIcon } from '@chakra-ui/icons';
import { TbVectorBezier2 } from 'react-icons/tb/index.js';
import { filterUtilizationForActionType } from '../../utils/utilization.js';
import { ActionType, Utilization } from '../../types/types.js';
import isEmpty from 'lodash.isempty';
import { RecommendationsActionSummaryProps } from '../utilization-recommendations-types.js';



export function RecommendationsActionSummary (props: RecommendationsActionSummaryProps) {
  const { utilization, onContinue } = props;

  function getNumberOfResourcesFromFilteredActions (filtered: { [service: string]: Utilization<string> }): number {
    let total = 0;
    Object.keys(filtered).forEach((s) => {
      if (!filtered[s] || isEmpty(filtered[s])) return;
      total += Object.keys(filtered[s]).length;
    });
    return total;
  }

  const deleteChanges = filterUtilizationForActionType(utilization, ActionType.DELETE);
  const scaleDownChanges = filterUtilizationForActionType(utilization, ActionType.SCALE_DOWN);
  const optimizeChanges = filterUtilizationForActionType(utilization, ActionType.OPTIMIZE);

  const numDeleteChanges = getNumberOfResourcesFromFilteredActions(deleteChanges);
  const numScaleDownChanges = getNumberOfResourcesFromFilteredActions(scaleDownChanges);
  const numOptimizeChanges = getNumberOfResourcesFromFilteredActions(optimizeChanges);

  function actionSummaryStack (
    actionType: ActionType, icon: JSX.Element, actionLabel: string, numResources: number, description: string
  ) {
    return (
      <Stack w="100%" p='2'>
        <Flex>
          <Box w='20px'>
            {icon}
          </Box>
          <Stack w='450px'>
            <Box>
              <Heading as='h5' size='sm'>{actionLabel}</Heading>
            </Box>
            <Box>
              <Text fontSize='sm' color='gray.500' pl='2'>{description}</Text>
            </Box>
          </Stack>
          <Box w='150px'>
            <Text fontSize='sm' color='gray.500'>{numResources} available</Text>
          </Box>
          <Spacer />
          <Button colorScheme='purple' size='sm' onClick={() => onContinue(actionType)}>
            Review <ArrowForwardIcon />
          </Button>
        </Flex>
      </Stack>
    );
  }

  return (
    <Stack pt="20px" pb="20px" w="100%">
      {actionSummaryStack(
        ActionType.DELETE, <DeleteIcon color='gray' />, 'Delete', numDeleteChanges,
        'Resources that have had no recent activity.'
      )}
      <hr />
      {actionSummaryStack(
        ActionType.SCALE_DOWN, <ArrowDownIcon color='gray' />, 'Scale Down', numScaleDownChanges,
        'Resources are recently underutilized.'
      )}
      <hr />
      {actionSummaryStack(
        ActionType.OPTIMIZE, <Icon as={TbVectorBezier2} color='gray' />, 'Optimize', numOptimizeChanges,
        'Resources that would be more cost effective using an AWS optimization tool.'
      )}
    </Stack>
  );
}