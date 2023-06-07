import { Widget } from '@tinystacks/ops-model';
import { ActionType, AwsResourceType, HistoryEvent, Utilization } from './types.js';

interface HasActionType {
  actionType: ActionType;
}

interface HasUtilization {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  sessionHistory: HistoryEvent[];

}

interface RemovableResource {
  onRemoveResource: (resourceArn: string) => void;
}

interface HasResourcesAction {
  onResourcesAction: (resourceArns: string[], actionType: string) => void;
}

interface Refresh {
  onRefresh: () => void;
}

export type UtilizationRecommendationsUiProps = HasUtilization & HasResourcesAction & Refresh
export type UtilizationRecommendationsWidget = Widget & HasActionType & HasUtilization & {
  region: string
};
export type RecommendationsCallback = (props: RecommendationsOverrides) => void;
export type RecommendationsOverrides = {
  refresh?: boolean;
  resourceActions?: {
    actionType: string,
    resourceArns: string[]
  }
};
export type RecommendationsTableProps = HasActionType & HasUtilization & {
  onContinue: (resourceArns: string[]) => void;
  onBack: () => void;
  onRefresh: () => void;
};
export type RecommendationsActionsSummaryProps = Widget & HasUtilization;
export type RecommendationsActionSummaryProps = HasUtilization & {
  onContinue: (selectedActionType: ActionType) => void;
  onRefresh: () => void;
};
export type ConfirmSingleRecommendationProps = RemovableResource & HasActionType & HasResourcesAction & {
  resourceArn: string;
};
export type ConfirmRecommendationsProps = RemovableResource & HasActionType & HasResourcesAction & HasUtilization & {
  resourceArns: string[];
  onBack: () => void;
};

export type ServiceTableRowProps = {
  serviceUtil: Utilization<string>;
  serviceName: string;
  children?: React.ReactNode;
  onServiceCheckChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isChecked: boolean;
};