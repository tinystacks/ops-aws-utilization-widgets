import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { DescribeNatGatewaysCommandOutput, EC2, NatGateway } from '@aws-sdk/client-ec2';
import { Pricing } from '@aws-sdk/client-pricing';
import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import get from 'lodash.get';
import { Arns } from '../types/constants.js';
import { AwsServiceOverrides } from '../types/types.js';
import { getAccountId, getHourlyCost, rateLimitMap } from '../utils/utils.js';
import { AwsServiceUtilization } from './aws-service-utilization.js';

/**
 * const DEFAULT_RECOMMENDATION = 'review this NAT Gateway and the Route Tables associated with its VPC. If another' +
 * 'NAT Gateway exists in the VPC, repoint routes to that gateway and delete this gateway. If this is the only' +
 * 'NAT Gateway in your VPC and resources depend on network traffic, retain this gateway.';
*/

type AwsNatGatewayUtilizationScenarioTypes = 'activeConnectionCount' | 'totalThroughput';
const AwsNatGatewayMetrics = ['ActiveConnectionCount', 'BytesInFromDestination'];

export class AwsNatGatewayUtilization extends AwsServiceUtilization<AwsNatGatewayUtilizationScenarioTypes> {
  accountId: string;
  cost: number;

  constructor () {
    super();
  }

  async doAction (
    awsCredentialsProvider: AwsCredentialsProvider, actionName: string, resourceArn: string, region: string
  ): Promise<void> {
    const resourceId = (resourceArn.split(':').at(-1)).split('/').at(-1);
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

  private async getAllNatGateways (credentials: any, region: string) {
    const ec2Client = new EC2({
      credentials,
      region
    });
    let allNatGateways: NatGateway[] = [];
    let describeNatGatewaysRes: DescribeNatGatewaysCommandOutput;
    do {
      describeNatGatewaysRes = await ec2Client.describeNatGateways({
        NextToken: describeNatGatewaysRes?.NextToken
      });
      allNatGateways = [...allNatGateways, ...describeNatGatewaysRes?.NatGateways || []];
    } while (describeNatGatewaysRes?.NextToken);

    return allNatGateways;
  }

  private async getNatGatewayMetrics (credentials: any, region: string, natGatewayId: string) {
    const cwClient = new CloudWatch({
      credentials,
      region
    });
    const fiveMinutesAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
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

    return metricDataRes.MetricDataResults;
  }

  private async getRegionalUtilization (credentials: any, region: string) {
    const allNatGateways = await this.getAllNatGateways(credentials, region);

    const analyzeNatGateway = async (natGateway: NatGateway) => {
      const natGatewayId = natGateway.NatGatewayId;
      const natGatewayArn = Arns.NatGateway(region, this.accountId, natGatewayId);
  
      const results = await this.getNatGatewayMetrics(credentials, region, natGatewayId);
      const activeConnectionCount = get(results, '[0].Values[0]') as number;
      if (activeConnectionCount === 0) {
        this.addScenario(natGatewayArn, 'activeConnectionCount', {
          value: activeConnectionCount.toString(),
          delete: {
            action: 'deleteNatGateway',
            isActionable: true,
            reason: 'This NAT Gateway has had 0 active connections over the past week. It appears to be unused.',
            monthlySavings: this.cost
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
            isActionable: true,
            reason: 'This NAT Gateway has had 0 total throughput over the past week. It appears to be unused.',
            monthlySavings: this.cost
          }
        });
      }

      await this.fillData(
        natGatewayArn,
        credentials,
        region,
        {
          resourceId: natGatewayId,
          region,
          monthlyCost: this.cost,
          hourlyCost: getHourlyCost(this.cost)
        }
      );

      AwsNatGatewayMetrics.forEach(async (metricName) => {  
        await this.getSidePanelMetrics(
          credentials, 
          region, 
          natGatewayArn,
          'AWS/NATGateway', 
          metricName, 
          [{ Name: 'NatGatewayId', Value: natGatewayId }]);
      });
    };

    await rateLimitMap(allNatGateways, 5, 5, analyzeNatGateway);
  }

  async getUtilization (
    awsCredentialsProvider: AwsCredentialsProvider, regions?: string[], _overrides?: AwsServiceOverrides
  ) {
    const credentials = await awsCredentialsProvider.getCredentials();
    this.accountId = await getAccountId(credentials);
    this.cost = await this.getNatGatewayPrice(credentials);  
    for (const region of regions) {
      await this.getRegionalUtilization(credentials, region);
    }
  }

  private async getNatGatewayPrice (credentials: any) {
    const pricingClient = new Pricing({
      credentials,
      // global but have to specify region
      region: 'us-east-1'
    });

    const res = await pricingClient.getProducts({
      ServiceCode: 'AmazonEC2',
      Filters: [
        {
          Type: 'TERM_MATCH',
          Field: 'productFamily',
          Value: 'NAT Gateway'
        },
        {
          Type: 'TERM_MATCH',
          Field: 'usageType',
          Value: 'NatGateway-Hours'
        }
      ]
    });
    const onDemandData = JSON.parse(res.PriceList[0] as string).terms.OnDemand;
    const onDemandKeys = Object.keys(onDemandData);
    const priceDimensionsData = onDemandData[onDemandKeys[0]].priceDimensions;
    const priceDimensionsKeys = Object.keys(priceDimensionsData);
    const pricePerHour = priceDimensionsData[priceDimensionsKeys[0]].pricePerUnit.USD;

    // monthly cost
    return pricePerHour * 24 * 30;
  }
}