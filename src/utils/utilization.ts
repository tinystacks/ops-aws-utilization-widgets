import isEmpty from 'lodash.isempty';
import { ActionType, Scenarios, Utilization } from '../types/types';

export function filterUtilizationForActionType (
  utilization: { [service: string]: Utilization<string> }, actionType: ActionType
):
{ [service: string]: Utilization<string> } {
  const filtered: { [service: string]: Utilization<string> } = {};

  if (!utilization) {
    return filtered;
  }

  Object.keys(utilization).forEach((service) => {
    filtered[service] = filterServiceForActionType(utilization, service, actionType);
  });
  return filtered;
}

export function filterServiceForActionType (
  utilization: { [service: string]: Utilization<string> }, service: string, actionType: ActionType
) {
  const serviceUtil = utilization[service];
  const actionFilteredServiceUtil = 
    Object.entries(serviceUtil).reduce<Utilization<string>>((aggUtil, [id, resource]) => {
      const filteredScenarios: Scenarios<string> = {};
      Object.entries(resource.scenarios).forEach(([sType, details]) => {
        if (Object.hasOwn(details, actionType)) {
          filteredScenarios[sType] = details;
        }
      });
      
      if (!filteredScenarios || isEmpty(filteredScenarios)) {
        return aggUtil;
      }
      
      aggUtil[id] = {
        ...resource,
        scenarios: filteredScenarios 
      };
      return aggUtil;
    }, {});
  return actionFilteredServiceUtil;
}

export function getNumberOfResourcesFromFilteredActions (filtered: { [service: string]: Utilization<string> }): number {
  let total = 0;
  Object.keys(filtered).forEach((s) => {
    if (!filtered[s] || isEmpty(filtered[s])) return;
    total += Object.keys(filtered[s]).length;
  });
  return total;
}

export function getTotalNumberOfResources ( utilization: { [service: string]: Utilization<string> }): number { 
  let total = 0; 
  Object.keys(utilization).forEach((service) => {
    if (!utilization[service] || isEmpty(utilization[service])) return;
    total += Object.keys(utilization[service]).length;
  });

  return total;
}

export function sentenceCase (name: string): string{ 
  const result = name.replace(/([A-Z])/g, ' $1');
  return result[0].toUpperCase() + result.substring(1).toLowerCase();
}