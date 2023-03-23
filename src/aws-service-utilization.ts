import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';

export enum AlertType {
  Warning = 'Warning',
  Alarm = 'Alarm',
}

export type Utilization<ScenarioType> = {
  [ resourceName: string ]: {
    [ scenario in keyof ScenarioType ]: {
      value: ScenarioType[scenario]
      alert: {
        type: AlertType,
        recommendation: string,
        actions: { (...args: any[]): void; } []
      }
    }
  }
}

type testScenarioTypes = {
  retentionInDays?: number,
  lastEventTime?: string
}

const testUtilization: Utilization<testScenarioTypes> = {
  logGroup1: {
    retentionInDays: {
      value: 0,
      alert: {
        type: AlertType.Warning,
        recommendation: 'a retention policy on this log group will ensure storage bytes do not accumulate',
        actions: []
      }
    },
    lastEventTime: {
      value: 'ex. more than 7 days ago',
      alert: {
        type: AlertType.Warning,
        recommendation: 'the last event found in this log group occurred over a week ago',
        actions: [ () => { console.log('delete log group'); } ]
      }
    }
  }
};

export abstract class AwsServiceUtilization<ScenarioType> {
  utilization: Utilization<ScenarioType>;

  abstract getAssessment (awsCredentialsProvider: AwsCredentialsProvider, region: string): void | Promise<void>;
}