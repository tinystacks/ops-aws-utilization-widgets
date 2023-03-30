import { AutoScaling } from '@aws-sdk/client-auto-scaling';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { AwsServiceUtilization, Utilization, AlertType } from './aws-service-utilization.js';

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

    const autoScalingClient = new AutoScaling({ 
      credentials: await awsCredentialsProvider.getCredentials(), 
      region: region
    });

    //get all autoscaling groups!
    let autoScalingGroups: {name: string, arn: string}[] = []; 
    let asgRes = await autoScalingClient.describeAutoScalingGroups({}); 
    const groups = asgRes.AutoScalingGroups.map((group) => { 
      return { 
        name: group.AutoScalingGroupName, 
        arn: group.AutoScalingGroupARN
      };
    });
    
    autoScalingGroups = [...autoScalingGroups, ...groups]; 
    while(asgRes.NextToken){ 
      asgRes = await autoScalingClient.describeAutoScalingGroups({});
      autoScalingGroups = [...autoScalingGroups, ...asgRes.AutoScalingGroups.map((group) => { 
        return { 
          name: group.AutoScalingGroupName, 
          arn: group.AutoScalingGroupARN
        };
      })]; 
    }
    //get all auto scaling policies!
    const policies: string [] = [];
    let res = await autoScalingClient.describePolicies({}); 

    policies.push(...res.ScalingPolicies.map((policy) => {
      return policy.AutoScalingGroupName;
    }));
    while(res.NextToken){ 
      res = await autoScalingClient.describePolicies({}); 
      policies.push(...res.ScalingPolicies.map((policy) => {
        return policy.AutoScalingGroupName;
      }));
    }

    const cloudWatchClient = new CloudWatch({ 
      credentials: await awsCredentialsProvider.getCredentials(), 
      region: region
    });

    autoScalingGroups.forEach(async (group) => { 
      const cpuUtilPercent = await this.getGroupCPUUTilization(cloudWatchClient, group.name); 
      if(cpuUtilPercent < 50){ 
        this.smartFill(group.name, 'cpuUtilization', {
          value: cpuUtilPercent, 
          alertType: AlertType.Warning, 
          reason: 'Max CPU Utilization has been under 50% for the last week', 
          recommendation: 'scale down instance', 
          actions: ['scaleDownInstance']
        }
        );
      }
    });

  } 

  //tested!
  static findGroupsWithoutScalingPolicy (groups: {name: string, arn: string}[], scalingPolicies: string[]): Utilization<AutoScalingGroupsUtilizationProps> { 

    const utilization: Utilization<AutoScalingGroupsUtilizationProps> = {};
    
    groups.forEach((group) => { 
      if(!scalingPolicies.includes(group.name)){ 
        utilization[group.name] = { 
          hasScalingPolicy: 
          { 
            value: false, 
            alertType: AlertType.Warning, 
            reason: 'the auto scaling group is missing a scaling poilcy', 
            recommendation: 'create auto-scaling policy', 
            actions: ['createScalingPolicy']
          }
        };
      }
    });

  
    return utilization;

    

  }

  async getGroupCPUUTilization (cloudWatchClient: CloudWatch, groupName: string){

    //thinking we'll get the cpu utilization over 1 week period, ideally we want two data points a day 
    // so set period to be 12 hours --> 43200
    //and then take the max, make a determination based on that number

    const metricStats = await cloudWatchClient.getMetricStatistics({ 
      Namespace: 'AWS/EC2', 
      MetricName: 'CPUUtilization', 
      StartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), //one week of data
      EndTime: new Date(Date.now()), 
      Period: 43200, //this should give us 14 data points
      Dimensions: [{ 
        Name: 'AutoScalingGroupName', 
        Value: groupName
      }], 
      Unit: 'Percent'
    }); 

    const cpuValues = metricStats.Datapoints.map((data) => { 
      return data.Maximum;
    });

    return Math.max(...cpuValues);
  }
}