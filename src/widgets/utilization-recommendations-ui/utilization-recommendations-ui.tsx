import React, { useState } from 'react';
import { ActionType } from '../../types/types.js';
import { RecommendationsActionSummary } from './recommendations-action-summary.js';
import { RecommendationsTable } from './recommendations-table.js';
import { ConfirmRecommendations } from './confirm-recommendations.js';
import { UtilizationRecommendationsUiProps } from '../utilization-recommendations-types.js';

enum WizardSteps {
  SUMMARY='summary',
  TABLE='table',
  CONFIRM='confirm'
}

export function UtilizationRecommendationsUi (props: UtilizationRecommendationsUiProps) {
  const { utilization, onResourcesAction } = props;
  const [wizardStep, setWizardStep] = useState<string>(WizardSteps.SUMMARY);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [actionType, setActionType] = useState<ActionType>(ActionType.DELETE);

  if (wizardStep === WizardSteps.SUMMARY) {
    return (
      <RecommendationsActionSummary
        utilization={utilization}
        onContinue={(selectedActionType: ActionType) => {
          setActionType(selectedActionType);
          setWizardStep(WizardSteps.TABLE);
        }}
      />
    );
  }
  if (wizardStep === WizardSteps.TABLE) {
    return (
      <RecommendationsTable
        utilization={utilization}
        actionType={actionType}
        onContinue={(checkedResources) => {
          setWizardStep(WizardSteps.CONFIRM);
          setSelectedResourceIds(checkedResources);
        }}
      />
    );
  }
  
  if (wizardStep === WizardSteps.CONFIRM) {
    return (
      <ConfirmRecommendations
        resourceIds={selectedResourceIds}
        actionType={actionType}
        onRemoveResource={(resourceId: string) => {
          setSelectedResourceIds(selectedResourceIds.filter((r: string) => r !== resourceId));
        }}
        onResourcesAction={onResourcesAction}
      />);
  }

  return (
    <RecommendationsActionSummary
      utilization={utilization}
      onContinue={(selectedActionType: ActionType) => {
        setActionType(selectedActionType);
        setWizardStep(WizardSteps.TABLE);
      }}
    />
  );
  // #endregion
}