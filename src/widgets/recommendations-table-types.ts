import { Widget } from '@tinystacks/ops-model';
import { ActionType, AwsResourceType, Utilization } from '../types/types.js';

export type RecommendationsTableProps = Widget & {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  actionType: ActionType;
};

export type RecommendationsCallback = (props: RecommendationsOverrides) => void;
export type RecommendationsOverrides = {
  refresh: boolean;
};