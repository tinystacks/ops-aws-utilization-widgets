import { Widget } from '@tinystacks/ops-model';
import { ActionType, AwsResourceType, Utilization } from '../types/types.js';

interface HasActionType {
  actionType: ActionType;
}

interface HasUtilization {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
}

interface RemovableResource {
  onRemoveResource: (resourceId: string) => void;
}

interface HasResourcesAction {
  onResourcesAction: (resourceIds: string[], actionType: string) => void;
}

export type UtilizationRecommendationsUiProps = HasUtilization & HasResourcesAction
export type UtilizationRecommendationsWidget = Widget & HasActionType & HasUtilization & {
  region: string
};
export type RecommendationsCallback = (props: RecommendationsOverrides) => void;
export type RecommendationsOverrides = {
  refresh?: boolean;
  resourceActions?: {
    actionType: string,
    resourceIds: string[]
  }
};
export type RecommendationsTableProps = HasActionType & HasUtilization & {
  onContinue: (resourceIds: string[]) => void;
};
export type RecommendationsActionsSummaryProps = Widget & HasUtilization;
export type RecommendationsActionSummaryProps = HasUtilization & {
  onContinue: (selectedActionType: ActionType) => void;
};
export type ConfirmSingleRecommendationProps = RemovableResource & HasActionType & HasResourcesAction & {
  resourceId: string;
};
export type ConfirmRecommendationsProps = RemovableResource & HasActionType & HasResourcesAction & HasUtilization & {
  resourceIds: string[];
};

export type ServiceTableRowProps = {
  serviceUtil: Utilization<string>;
  serviceName: string;
  children?: React.ReactNode;
  onServiceCheckChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isChecked: boolean;
};