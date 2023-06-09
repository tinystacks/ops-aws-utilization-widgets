import React, { useState } from 'react';
import { ActionType } from '../../types/types.js';
import { RecommendationsActionSummary } from './recommendations-action-summary.js';
import { RecommendationsTable } from './recommendations-table.js';
import { ConfirmRecommendations } from './confirm-recommendations.js';
import { UtilizationRecommendationsUiProps } from '../../types/utilization-recommendations-types.js';

enum WizardSteps {
  SUMMARY='summary',
  TABLE='table',
  CONFIRM='confirm'
}

export function UtilizationRecommendationsUi (props: UtilizationRecommendationsUiProps) {
  const { utilization, sessionHistory, onResourcesAction, onRefresh, allRegions, region, onRegionChange } = props;
  const [wizardStep, setWizardStep] = useState<string>(WizardSteps.SUMMARY);
  const [selectedResourceArns, setSelectedResourceArns] = useState<string[]>([]);
  const [actionType, setActionType] = useState<ActionType>(ActionType.DELETE);

  if (wizardStep === WizardSteps.SUMMARY) {
    return (
      <RecommendationsActionSummary
        utilization={utilization}
        sessionHistory={sessionHistory}
        onRefresh={onRefresh}
        onContinue={(selectedActionType: ActionType) => {
          setActionType(selectedActionType);
          setWizardStep(WizardSteps.TABLE);
        }}
        allRegions={allRegions}
        onRegionChange={onRegionChange}
        region={region}
      />
    );
  }
  if (wizardStep === WizardSteps.TABLE) {
    return (
      <RecommendationsTable
        utilization={utilization}
        actionType={actionType}
        sessionHistory={sessionHistory}
        onRefresh={() => { 
          onRefresh();
          setWizardStep(WizardSteps.TABLE); //this does nothing
        }}
        onContinue={(checkedResources) => {
          setWizardStep(WizardSteps.CONFIRM);
          setSelectedResourceArns(checkedResources);
        }}
        onBack={() => { 
          setWizardStep(WizardSteps.SUMMARY);
          setSelectedResourceArns([]);
        }}
      />
    );
  }
  
  if (wizardStep === WizardSteps.CONFIRM) {
    return (
      <ConfirmRecommendations
        resourceArns={selectedResourceArns}
        actionType={actionType}
        sessionHistory={sessionHistory}
        onRemoveResource={(resourceArn: string) => {
          setSelectedResourceArns(selectedResourceArns.filter((r: string) => r !== resourceArn));
        }}
        onResourcesAction={onResourcesAction}
        utilization={utilization}
        onBack={() => { 
          setWizardStep(WizardSteps.TABLE);
        }}
      />);
  }
  return (
    <RecommendationsActionSummary
      utilization={utilization}
      sessionHistory={sessionHistory}
      onRefresh={onRefresh}
      onContinue={(selectedActionType: ActionType) => {
        setActionType(selectedActionType);
        setWizardStep(WizardSteps.TABLE);
      }}
      allRegions={allRegions}
      region={region}
      onRegionChange={onRegionChange}
    />
  );
  // #endregion
}