import React from 'react';
import { Box, Button, Flex, Heading, Icon, Spacer, Stack, Text } from '@chakra-ui/react';
import { DeleteIcon, ArrowForwardIcon, ArrowDownIcon } from '@chakra-ui/icons';
import { TbVectorBezier2 } from 'react-icons/tb/index.js';
import { filterUtilizationForActionType, getNumberOfResourcesFromFilteredActions, getNumberOfResourcesInProgress } from '../../utils/utilization.js';
import { ActionType } from '../../types/types.js';
import { RecommendationsActionSummaryProps } from '../../types/utilization-recommendations-types.js';
import { TbRefresh } from 'react-icons/tb/index.js';



export function RecommendationsActionSummary (props: RecommendationsActionSummaryProps) {
  const { utilization, sessionHistory, onContinue, onRefresh } = props;

  const deleteChanges = filterUtilizationForActionType(utilization, ActionType.DELETE, sessionHistory);
  const scaleDownChanges = filterUtilizationForActionType(utilization, ActionType.SCALE_DOWN, sessionHistory);
  const optimizeChanges = filterUtilizationForActionType(utilization, ActionType.OPTIMIZE, sessionHistory);

  const numDeleteChanges = getNumberOfResourcesFromFilteredActions(deleteChanges);
  const numScaleDownChanges = getNumberOfResourcesFromFilteredActions(scaleDownChanges);
  const numOptimizeChanges = getNumberOfResourcesFromFilteredActions(optimizeChanges);

  const inProgressActions = getNumberOfResourcesInProgress(sessionHistory);
  console.log('sessionHistory: ', sessionHistory);
  console.log(inProgressActions); 

  function actionSummaryStack (
    actionType: ActionType, icon: JSX.Element, actionLabel: string, 
    numResources: number, description: string, numResourcesInProgress: number
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
            {numResourcesInProgress ? 
              <Text fontSize='sm' color='gray.500'>{numResourcesInProgress} in progress</Text> : null }
          </Box>
          <Button 
            colorScheme="purple"
            variant="outline" 
            marginRight={'8px'} 
            size='sm'
            border="0px"
            onClick={() => onRefresh()}
          >
            <Icon as={TbRefresh} />
          </Button>
          <Button
            colorScheme='purple'
            size='sm'
            onClick={() => onContinue(actionType)}
          >
            {<>Review <ArrowForwardIcon /></>}
          </Button>
        </Flex>
      </Stack>
    );
  }

  return (
    <Stack pt="20px" pb="20px" w="100%">
      {actionSummaryStack(
        ActionType.DELETE, <DeleteIcon color='gray' />, 'Delete', numDeleteChanges,
        'Resources that have had no recent activity.', inProgressActions['delete']
      )}
      <hr />
      {actionSummaryStack(
        ActionType.SCALE_DOWN, <ArrowDownIcon color='gray' />, 'Scale Down', numScaleDownChanges,
        'Resources are recently underutilized.', inProgressActions['scaleDown']
      )}
      <hr />
      {actionSummaryStack(
        ActionType.OPTIMIZE, <Icon as={TbVectorBezier2} color='gray' />, 'Optimize', numOptimizeChanges,
        'Resources that would be more cost effective using an AWS optimization tool.', inProgressActions['optimize']
      )}
    </Stack>
  );
}