import { Widget } from '@tinystacks/ops-model';
import { ActionType, HistoryEvent, Utilization } from './types.js';
import { AwsResourceType } from '../ops-types.js';

export type HasActionType = {
  actionType: ActionType;
}

export type HasUtilization = {
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

export type UtilizationRecommendationsWidget = Widget & HasActionType & HasUtilization & {
  region: string
};
export interface Regions {
  onRegionChange: (region: string) => void;
  allRegions: string[];
  region: string;
}

export type UtilizationRecommendationsUiProps = HasUtilization & HasResourcesAction & Refresh & Regions;
export type RecommendationsCallback = (props: RecommendationsOverrides) => void;
export type RecommendationsOverrides = {
  refresh?: boolean;
  resourceActions?: {
    actionType: string,
    resourceArns: string[]
  };
  region?: string;
};
export type RecommendationsTableProps = HasActionType & HasUtilization & {
  onContinue: (resourceArns: string[]) => void;
  onBack: () => void;
  onRefresh: () => void;
};
export type RecommendationsActionsSummaryProps = Widget & HasUtilization;
export type RecommendationsActionSummaryProps = HasUtilization & Regions & {
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