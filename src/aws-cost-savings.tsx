import { CostExplorer } from '@aws-sdk/client-cost-explorer';
import { BaseProvider, BaseWidget } from '@tinystacks/ops-core';
import { Widget } from '@tinystacks/ops-model';
import dayjs from 'dayjs';
import { Utilization } from './types/types.js';
import { getAwsCredentialsProvider } from './utils/utils.js';

type AwsCostSavingsType = Widget & {
  utilizations?: { [ serviceName: string ]: Utilization<string> };
};

export class AwsCostSavings extends BaseWidget {
  utilizations?: { [ serviceName: string ]: Utilization<string> };

  constructor (props: AwsCostSavingsType) {
    super(props);
    this.utilizations = props.utilizations;
  }

  async getData (providers?: BaseProvider[], _overrides?: any): Promise<void> {
    const awsCredentialsProvider = getAwsCredentialsProvider(providers);
    // const resourceArns = Object.keys(this.utilizations[serviceName]);
    const costExplorerClient = new CostExplorer({
      credentials: await awsCredentialsProvider.getCredentials(),
      region: 'us-east-1'
    });
    console.log('here');
    console.log(dayjs().subtract(3, 'month').format('YYYY-MM-DD'));
    console.log(dayjs().format('YYYY-MM-DD'));
    const res = await costExplorerClient.getCostAndUsage({
      Metrics: [ 'UnblendedCost' ],
      Granularity: 'MONTHLY',
      TimePeriod: {
        Start: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
        End: dayjs().format('YYYY-MM-DD')
      },
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        },
        {
          Type: 'DIMENSION',
          Key: 'REGION'
        }
      ],
      Filter: {
        And: [
          {
            Dimensions: {
              Key: 'USAGE_TYPE_GROUP',
              Values: ['NAT Gateway']
            }
          },
          {
            Dimensions: {
              Key: 'SERVICE',
              Values: ['VPC']
            }
          }
        ]
      }
    });
    console.log(res.ResultsByTime[0].Total);
    const results = res.ResultsByTime;
    results.forEach((result) => {
      const timePeriod = result.TimePeriod;
      const groups = result.Groups;
      groups.forEach((group) => {
        const regionName = group.Keys[0];
        const serviceName = group.Keys[1];
        const value = group.Metrics.UnblendedCost.Amount;
        console.log(`Cost for ${serviceName} in ${regionName} from ${timePeriod.Start} to ${timePeriod.End}: $${value}`);
      });
    });
  }
  render (_children?: (Widget & { renderedElement: JSX.Element })[], _overridesCallback?: (overrides: any) => void): JSX.Element {
    throw new Error('Method not implemented.');
  }
}