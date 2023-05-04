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
      <Stack w="100%" p='2' pl='5' pr='5'>
        <Flex>
          <Box w='20px'>
            {icon}
          </Box>
          <Stack w='450px' pl='1'>
            <Box>
              <Heading as='h5' size='sm'>{actionLabel}</Heading>
            </Box>
            <Box>
              <Text fontSize='sm' color='gray.500'>{description}</Text>
            </Box>
          </Stack>
          <Spacer />
          <Box w='150px'>
            <Text fontSize='sm' color='gray.500'>{numResources} available</Text>
          </Box>
          <Button
            colorScheme={actionType === ActionType.DELETE ? 'purple' : 'gray'}
            size='sm'
            disabled={actionType !== ActionType.DELETE}
            onClick={() => actionType === ActionType.DELETE ? onContinue(actionType) : undefined}
          >
            {actionType === ActionType.DELETE ? <>Review <ArrowForwardIcon /></> : <>Coming Soon!</>}
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