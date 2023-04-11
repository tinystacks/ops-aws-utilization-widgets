import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { EC2 } from '@aws-sdk/client-ec2';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import _ from 'lodash';
import { AlertType } from '../types/types.js';
import { AwsServiceUtilization } from './aws-service-utilization.js';

const DEFAULT_RECOMMENDATION = 'review this NAT Gateway and the Route Tables associated with its VPC. If another NAT Gateway exists in the VPC, repoint routes to that gateway and delete this gateway. If this is the only NAT Gateway in your VPC and resources depend on network traffic, retain this gateway.';

type AwsNatGatewayUtilizationScenarioTypes = {
  activeConnectionCount: number,
  totalThroughput: number
}

export class AwsNatGatewayUtilization extends AwsServiceUtilization<AwsNatGatewayUtilizationScenarioTypes> {

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, region: string, _overrides?: any) {
    const credentials = await awsCredentialsProvider.getCredentials();
    const ec2Client = new EC2({
      credentials,
      region
    });
    const cwClient = new CloudWatch({
      credentials,
      region
    });

    const res = await ec2Client.describeNatGateways({});
    const natGatewayIds = res.NatGateways.map(natGateway => natGateway.NatGatewayId);
    for (const natGatewayId of natGatewayIds) {
      const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));
      const metricDataRes = await cwClient.getMetricData({
        MetricDataQueries: [
          {
            Id: 'activeConnectionCount',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/NATGateway',
                MetricName: 'ActiveConnectionCount',
                Dimensions: [{
                  Name: 'NatGatewayId',
                  Value: natGatewayId
                }]
              },
              Period: 5 * 60, // 5 minutes
              Stat: 'Maximum'
            }
          },
          {
            Id: 'bytesInFromDestination',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/NATGateway',
                MetricName: 'BytesInFromDestination',
                Dimensions: [{
                  Name: 'NatGatewayId',
                  Value: natGatewayId
                }]
              },
              Period: 5 * 60, // 5 minutes
              Stat: 'Sum'
            }
          },
          {
            Id: 'bytesInFromSource',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/NATGateway',
                MetricName: 'BytesInFromSource',
                Dimensions: [{
                  Name: 'NatGatewayId',
                  Value: natGatewayId
                }]
              },
              Period: 5 * 60, // 5 minutes
              Stat: 'Sum'
            }
          },
          {
            Id: 'bytesOutToDestination',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/NATGateway',
                MetricName: 'BytesOutToDestination',
                Dimensions: [{
                  Name: 'NatGatewayId',
                  Value: natGatewayId
                }]
              },
              Period: 5 * 60, // 5 minutes
              Stat: 'Sum'
            }
          },
          {
            Id: 'bytesOutToSource',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/NATGateway',
                MetricName: 'BytesOutToSource',
                Dimensions: [{
                  Name: 'NatGatewayId',
                  Value: natGatewayId
                }]
              },
              Period: 5 * 60, // 5 minutes
              Stat: 'Sum'
            }
          }
        ],
        StartTime: fiveMinutesAgo,
        EndTime: new Date()
      });

      const results = metricDataRes.MetricDataResults;
      const activeConnectionCount = _.get(results, '[0].Values[0]');
      if (activeConnectionCount === 0) {
        this.addScenario(natGatewayId, 'activeConnectionCount', {
          value: activeConnectionCount,
          alertType: AlertType.Alarm,
          reason: 'this NAT Gateway currently has 0 active connections',
          recommendation: DEFAULT_RECOMMENDATION,
          actions: []
        });
      }
      const totalThroughput = 
        _.get(results, '[1].Values[0]', 0) + 
        _.get(results, '[2].Values[0]', 0) + 
        _.get(results, '[3].Values[0]', 0) +
        _.get(results, '[4].Values[0]', 0);
      if (totalThroughput === 0) {
        this.addScenario(natGatewayId, 'totalThroughput', {
          value: activeConnectionCount,
          alertType: AlertType.Alarm,
          reason: 'this NAT Gateway currently has 0 total throughput',
          recommendation: DEFAULT_RECOMMENDATION,
          actions: []
        });
      }
    }
    console.log(this.utilization);
  }
}