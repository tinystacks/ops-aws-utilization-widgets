import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { DescribeNatGatewaysCommandOutput, EC2 } from '@aws-sdk/client-ec2';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import get from 'lodash.get';
import { Arns } from '../types/constants.js';
import { NatGatewayWithRegion } from '../types/types.js';
import { getAccountId, listAllRegions } from '../utils/utils.js';
import { AwsServiceUtilization } from './aws-service-utilization.js';

/**
 * const DEFAULT_RECOMMENDATION = 'review this NAT Gateway and the Route Tables associated with its VPC. If another' +
 * 'NAT Gateway exists in the VPC, repoint routes to that gateway and delete this gateway. If this is the only' +
 * 'NAT Gateway in your VPC and resources depend on network traffic, retain this gateway.';
*/

type AwsNatGatewayUtilizationScenarioTypes = 'activeConnectionCount' | 'totalThroughput';

export class AwsNatGatewayUtilization extends AwsServiceUtilization<AwsNatGatewayUtilizationScenarioTypes> {
  constructor () {
    super();
  }

  async doAction (
    awsCredentialsProvider: AwsCredentialsProvider, actionName: string, resourceId: string, region: string
  ): Promise<void> {
    if (actionName === 'deleteNatGateway') {
      const ec2Client = new EC2({
        credentials: await awsCredentialsProvider.getCredentials(),
        region
      });
      await this.deleteNatGateway(ec2Client, resourceId);
    }
  }

  async deleteNatGateway (ec2Client: EC2, natGatewayId: string) {
    await ec2Client.deleteNatGateway({
      NatGatewayId: natGatewayId
    });
  }

  private async getAllNatGateways (credentials: any, regions: string[]) {
    let allNatGateways: NatGatewayWithRegion[] = [];
    void await Promise.all(regions.map(async (region) => {
      const ec2Client = new EC2({
        credentials,
        region
      });
      let describeNatGatewaysRes: DescribeNatGatewaysCommandOutput;
      do {
        describeNatGatewaysRes = await ec2Client.describeNatGateways({
          NextToken: describeNatGatewaysRes?.NextToken
        });
        const natGatewaysWithRegion = describeNatGatewaysRes?.NatGateways?.map((natGateway) => {
          return {
            region,
            natGateway
          };
        });
        allNatGateways = [...allNatGateways, ...natGatewaysWithRegion];
      } while (describeNatGatewaysRes?.NextToken);
    }));
    return allNatGateways;
  }

  async getUtilization (awsCredentialsProvider: AwsCredentialsProvider, regions?: string[], _overrides?: any) {
    const credentials = await awsCredentialsProvider.getCredentials();
    const accountId = await getAccountId(credentials);
    const usedRegions = regions || await listAllRegions(credentials);
    const allNatGateways = await this.getAllNatGateways(credentials, usedRegions);
    void await Promise.all(allNatGateways.map(async (natGateway) => {
      const region = natGateway.region;
      const natGatewayId = natGateway.natGateway.NatGatewayId;
      const natGatewayArn = Arns.NatGateway(region, accountId, natGatewayId);
      const fiveMinutesAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      const cwClient = new CloudWatch({
        credentials,
        region
      });
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
      const activeConnectionCount = get(results, '[0].Values[0]') as number;
      if (activeConnectionCount === 0) {
        this.addScenario(natGatewayArn, 'activeConnectionCount', {
          value: activeConnectionCount.toString(),
          delete: {
            action: 'deleteNatGateway',
            reason: 'This NAT Gateway has had 0 active connections over the past week. It appears to be unused.'
          }
        });
      }
      const totalThroughput = 
        get(results, '[1].Values[0]', 0) + 
        get(results, '[2].Values[0]', 0) + 
        get(results, '[3].Values[0]', 0) +
        get(results, '[4].Values[0]', 0);
      if (totalThroughput === 0) {
        this.addScenario(natGatewayArn, 'totalThroughput', {
          value: totalThroughput.toString(),
          delete: {
            action: 'deleteNatGateway',
            reason: 'This NAT Gateway has had 0 total throughput over the past week. It appears to be unused.'
          }
        });
      }
      this.addData(natGatewayArn, 'resourceId', natGatewayId);
      this.addData(natGatewayArn, 'region', region);
    }));
    await this.identifyCloudformationStack(credentials);
    console.info(this.utilization);
  }
}