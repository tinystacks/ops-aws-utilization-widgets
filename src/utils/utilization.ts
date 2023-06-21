import isEmpty from 'lodash.isempty';
import { ActionType, HistoryEvent, Scenarios, Utilization } from '../types/types.js';

export function filterUtilizationForActionType (
  utilization: { [service: string]: Utilization<string> }, actionType: ActionType,  session: HistoryEvent[]
):
{ [service: string]: Utilization<string> } {
  const filtered: { [service: string]: Utilization<string> } = {};

  if (!utilization) {
    return filtered;
  }

  Object.keys(utilization).forEach((service) => {
    filtered[service] = filterServiceForActionType(utilization, service, actionType, session);
  });
  return filtered;
}

export function filterServiceForActionType (
  utilization: { [service: string]: Utilization<string> }, service: string, 
  actionType: ActionType, session: HistoryEvent[]
) {
  const resourcesInProgress = session.map((historyevent) => {
    return historyevent.resourceArn;
  });  

  const serviceUtil = utilization[service];
  const actionFilteredServiceUtil = 
    Object.entries(serviceUtil).reduce<Utilization<string>>((aggUtil, [id, resource]) => {
      if(resourcesInProgress.includes(id)){ 
        delete aggUtil[id];
        return aggUtil;
      }
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

export function getNumberOfResourcesInProgress (session: HistoryEvent[]): { [ key in ActionType ]: number } {
  const result: { [ key in ActionType ]: number } = {
    [ActionType.OPTIMIZE]: 0,
    [ActionType.DELETE]: 0,
    [ActionType.SCALE_DOWN]: 0
  };  

  session.forEach((historyEvent) => { 
    result[historyEvent.actionType] ++;
  });

  return result;

}

export function getTotalNumberOfResources ( utilization: { [service: string]: Utilization<string> }): number { 
  let total = 0; 
  Object.keys(utilization).forEach((service) => {
    if (!utilization[service] || isEmpty(utilization[service])) return;
    total += Object.keys(utilization[service]).length;
  });

  return total;
}

export function getTotalMonthlySavings (utilization: { [service: string]: Utilization<string> }): string { 
  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });
  
  let totalSavings = 0; 
  Object.keys(utilization).forEach((service) => {
    if (!utilization[service] || isEmpty(utilization[service])) return;
    Object.keys(utilization[service]).forEach((resource) => { 
      totalSavings += utilization[service][resource].data?.maxMonthlySavings || 0;
    });
  });

  return usd.format(totalSavings);
}

export function sentenceCase (name: string): string { 
  const result = name.replace(/([A-Z])/g, ' $1');
  return result[0].toUpperCase() + result.substring(1).toLowerCase();
}

export function splitServiceName (name: string) {
  return name?.split(/(?=[A-Z])/).join(' ');
}