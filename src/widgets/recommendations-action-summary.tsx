import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { ActionType, AwsResourceType, Utilization } from '../types/types.js';
import React from 'react';
import { RecommendationsActionsSummaryProps } from './recommendations-action-summary-types.js';
import { RecommendationsOverrides } from './recommendations-table-types.js';
import { Box, Button, HStack, Heading, Icon, Stack, Text } from '@chakra-ui/react';
import { DeleteIcon, ArrowForwardIcon, ArrowDownIcon } from '@chakra-ui/icons';
import { TbVectorBezier2 } from 'react-icons/tb/index.js';
import { filterUtilizationForActionType } from '../utils/utilization.js';
export class RecommendationsActionSummary extends BaseWidget {
  utilization?: { [key: AwsResourceType | string]: Utilization<string> };
  deleteLink: string;
  optimizeLink: string;
  scaleDownLink: string;

  constructor (props: RecommendationsActionsSummaryProps) {
    super(props);
    this.utilization = props.utilization;
    this.deleteLink = props.deleteLink || 'delete-recommendations';
    this.optimizeLink = props.optimizeLink || 'optimize-recommendations';
    this.scaleDownLink = props.scaleDownLink || 'scale-down-recommendations';
  }

  static fromJson (props: RecommendationsActionsSummaryProps) {
    return new RecommendationsActionSummary(props);
  }

  toJson () {
    return {
      ...super.toJson(),
      utilization: this.utilization,
      deleteLink: this.deleteLink,
      optimizeLink: this.optimizeLink,
      scaleDownLink: this.scaleDownLink
    };
  }

  async getData (providers: BaseProvider[], overrides?: RecommendationsOverrides) {
    const depMap = {
      utils: '../utils/utils.js'
    };
    const { getAwsCredentialsProvider, getAwsUtilizationProvider } = await import(depMap.utils);
    const utilProvider = getAwsUtilizationProvider(providers);
    const awsCredsProvider = getAwsCredentialsProvider(providers);

    if (overrides?.refresh) {
      await utilProvider.hardRefresh(awsCredsProvider, ['us-east-1']);
    }

    this.utilization = await utilProvider.getUtilization(awsCredsProvider, ['us-east-1']);
  }

  render () {
    const deleteChanges = filterUtilizationForActionType(this.utilization, ActionType.DELETE);
    const scaleDownChanges = filterUtilizationForActionType(this.utilization, ActionType.SCALE_DOWN);
    const optimizeChanges = filterUtilizationForActionType(this.utilization, ActionType.OPTIMIZE);
    return (
      <Stack>
        <Stack>
          <HStack>
            <Box w='20px'>
              <DeleteIcon color='gray' />
            </Box>
            <Box w='450px'>
              <Heading as='h5' size='sm'>Delete</Heading>
            </Box>
            <Box w='150px'>
              <Text fontSize='sm' color='gray.500'>{Object.keys(deleteChanges).length} available</Text>
            </Box>
            <Button colorScheme='purple' size='sm' as='a' href={'/' + this.deleteLink}>Review <ArrowForwardIcon /></Button>
          </HStack>
          <Text fontSize='sm' color='gray.500' pl='29px'>Resources that have had no recent activity.</Text>
        </Stack>
        <hr />
        <Stack>
          <HStack>
            <Box w='20px'>
              <ArrowDownIcon color='gray' />
            </Box>
            <Box w='450px'>
              <Heading as='h5' size='sm'>Scale Down</Heading>
            </Box>
            <Box w='150px'>
              <Text fontSize='sm' color='gray.500'>{Object.keys(scaleDownChanges).length} available</Text>
            </Box>
            <Button colorScheme='purple' size='sm' as='a' href={'/' + this.scaleDownLink}>Review <ArrowForwardIcon /></Button>
          </HStack>
          <Text fontSize='sm' color='gray.500' pl='29px'>Resources that have been recently underutilized.</Text>
        </Stack>
        <hr />
        <Stack>
          <HStack>
            <Box w='20px'>
              <Icon as={TbVectorBezier2} color='gray'/>
            </Box>
            <Box w='450px'>
              <Heading as='h5' size='sm'>Optimize</Heading>
            </Box>
            <Box w='150px'>
              <Text fontSize='sm' color='gray.500'>{Object.keys(optimizeChanges).length} available</Text>
            </Box>
            <Button colorScheme='purple' size='sm' as='a' href={'/' + this.optimizeLink}>Review <ArrowForwardIcon /></Button>
          </HStack>
          <Text fontSize='sm' color='gray.500' pl='29px'>Resources that have had no recent activity.</Text>
        </Stack>
      </Stack>
    );
  }
}