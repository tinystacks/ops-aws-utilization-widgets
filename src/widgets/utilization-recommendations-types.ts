import { Widget } from '@tinystacks/ops-model';
import { ActionType, AwsResourceType, Utilization } from '../types/types.js';

export type UtilizationRecommendationsWidget = Widget & {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  actionType: ActionType;
};

export type RecommendationsCallback = (props: RecommendationsOverrides) => void;
export type RecommendationsOverrides = {
  refresh: boolean;
};

export type RecommendationsTableProps = {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  actionType: ActionType;
  onContinue: (resourceIds: string[]) => void;
};

export type RecommendationsActionsSummaryProps = Widget & {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  deleteLink?: string;
  optimizeLink?: string;
  scaleDownLink?: string;
};

export type RecommendationsActionSummaryProps = {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  onContinue: (selectedActionType: ActionType) => void;
};

export type ConfirmSingleRecommendationProps = {
  resourceId: string;
  actionType: ActionType;
  onRemoveResource: (resourceId: string) => void;
};

export type ConfirmRecommendationsProps = {
  actionType: ActionType;
  resourceIds: string[];
  onRemoveResource: (resourceId: string) => void;
};

export type ServiceTableRowProps = {
  serviceUtil: Utilization<string>;
  serviceName: string;
  children?: React.ReactNode;
  onServiceCheckChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isChecked: boolean;
};