import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';

enum AlertType { 
  Warning = 'warning', //I think warning can just include any recommendations
  Alarm = 'alarm'
}

type Alert =  { 
  type: AlertType,
  description: string, 
  actions: Action[];
}

type Action = (...args: any[]) => void; 


type Scenario = { 
  type: string; 
  alerts: Alert[]; 
}


export abstract class AwsResourceUtilization { 
  resourceName: string; 
  resourceArn?: string;
  scenarios: Scenario[];

  constructor(
    resourceName: string,
    scenarios: Scenario[], 
    resourceArn?: string,
  ){ 
    this.resourceName = resourceName; 
    this.resourceArn = resourceArn; 
    this.scenarios = scenarios;
  }

  abstract getAssessment (awsCredentialsProvider: AwsCredentialsProvider, region: string): void | Promise<void>;

}
