import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AlertType, AwsServiceUtilization, Utilization } from './aws-service-utilization';
import * as AWS from 'aws-sdk';

export type AutoScalingGroupsUtilizationProps = { 
    hasScalingPolicy?: boolean; 
    cpuUtilization?: number;
    networkIn?: number;
}

/* scenarios
      1. Check if there's a scaling policy, if no scaling policy
          alert: warning -- no scaling policy
          action: create scaling policy! 
      2. CPU Utilization --> From CW this is already a percent for us!
          alert: warning -- CPU utilization is less than 50% --> 7 day! 
          action: scale down instance
          
          alert: alarm -- CPU utilization is less than 20%
          action: scale down instance
      3. Network Bandwith 
          alert: warning -- Max Network Bandwith is less than 25% of instance capacity 
          action: scale down instance
    */

export class AutoScalingGroupsUtilization extends AwsServiceUtilization<AutoScalingGroupsUtilizationProps> {

  constructor () {
    super();
  }
  
  async getAssessment (awsCredentialsProvider: AwsCredentialsProvider, region: string): Promise<void>{

    const autoScalingClient = new AWS.AutoScaling({ 
      credentials: await awsCredentialsProvider.getCredentials(), 
      region: region
    });

    /*const cloudWatchClient = new AWS.CloudWatch({ 
      credentials: await awsCredentialsProvider.getCredentials(), 
      region: region
    });

    const params = { 
      'MetricDataQueries': [{ 
        Expression: 'SELECT AVG(CPUUtilization) FROM SCHEMA("AWS/EC2", AutoScalingGroupName)',
        Id: 'cpuUtilQuery', 
        Period: 300
      }],
      'StartTime': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      'EndTime': new Date()
    };

    await cloudWatchClient.getMetricData(params).promise();*/

    //get all autoscaling groups!
    let autoScalingGroups: {name: string, arn: string}[] = []; 
    let asgRes = await autoScalingClient.describeAutoScalingGroups().promise(); 
    const groups = asgRes.AutoScalingGroups.map((group) => { 
      return { 
        name: group.AutoScalingGroupName, 
        arn: group.AutoScalingGroupARN
      };
    });
    
    autoScalingGroups = [...autoScalingGroups, ...groups]; 
    while(asgRes.NextToken){ 
      asgRes = await autoScalingClient.describeAutoScalingGroups().promise();
      autoScalingGroups = [...autoScalingGroups, ...asgRes.AutoScalingGroups.map((group) => { 
        return { 
          name: group.AutoScalingGroupName, 
          arn: group.AutoScalingGroupARN
        };
      })]; 
    }
    //get all auto scaling policies!
    const policies: string [] = [];
    let res = await autoScalingClient.describePolicies().promise(); 

    policies.push(...res.ScalingPolicies.map((policy) => {
      return policy.AutoScalingGroupName;
    }));
    while(res.NextToken){ 
      res = await autoScalingClient.describePolicies().promise(); 
      policies.push(...res.ScalingPolicies.map((policy) => {
        return policy.AutoScalingGroupName;
      }));
    }

    console.log('autoScalingGroups: ', autoScalingGroups);
    console.log('policies: ', policies);

  } 

  //tested!
  static findGroupsWithoutScalingPolicy (groups: {name: string, arn: string}[], scalingPolicies: string[]): Utilization<AutoScalingGroupsUtilizationProps> { 

    const utilization: Utilization<AutoScalingGroupsUtilizationProps> = {};

    const alert:  {
      type: AlertType,
      recommendation: string,
      actions: { (...args: any[]): void; } []
    } = { 
      type: AlertType.Warning, 
      recommendation: 'the auto scaling group is missing a scaling poilcy', 
      actions: [() => {console.log('I neeed a scaling policy');}]
    };
    
    groups.forEach((group) => { 
      if(!scalingPolicies.includes(group.name)){ 
        utilization[group.name] = { 
          hasScalingPolicy: 
          { 
            value: false, 
            alert: alert
          }
        };
      }
    });

  
    return utilization;

    

  }

}