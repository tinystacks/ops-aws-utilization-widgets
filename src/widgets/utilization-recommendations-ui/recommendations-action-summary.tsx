import React from 'react';
import { 
  Box, 
  Button, 
  Flex, 
  Heading, 
  Icon, 
  Menu, 
  MenuButton,
  MenuItem, 
  MenuList, 
  Spacer, 
  Stack, 
  Text 
} from '@chakra-ui/react';
import { DeleteIcon, ArrowForwardIcon, ArrowDownIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { TbVectorBezier2 } from 'react-icons/tb/index.js';
import { filterUtilizationForActionType, getNumberOfResourcesFromFilteredActions } from '../../utils/utilization.js';
import { ActionType } from '../../types/types.js';
import { RecommendationsActionSummaryProps } from '../../types/utilization-recommendations-types.js';
import { TbRefresh } from 'react-icons/tb/index.js';

export function RecommendationsActionSummary (props: RecommendationsActionSummaryProps) {
  const { utilization, onContinue, onRefresh, allRegions, region: regionLabel, onRegionChange } = props;

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
      <Box width="20%" px={4}>
        <Menu>
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
            {regionLabel}
          </MenuButton>
          <MenuList h={40} sx={{ overflow:'scroll' }}>
            {allRegions.map(region => 
              <MenuItem onClick={() => onRegionChange(region)}>{region}</MenuItem>
            )}
          </MenuList>
        </Menu>
      </Box>
      <hr />
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