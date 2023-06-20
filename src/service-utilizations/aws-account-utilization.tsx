import { AwsCredentialsProvider } from '@tinystacks/ops-aws-core-widgets';
import { AwsServiceUtilization } from './aws-service-utilization.js';
import { CostExplorer } from '@aws-sdk/client-cost-explorer';
import { Pricing } from '@aws-sdk/client-pricing';
import { AwsServiceOverrides } from '../types/types.js';

/**
 * The most relevant apis are the AWS Price List and AWS Cost Explorer APIs
 * enable price list apis
 *  https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-example-policies.html#example-policy-pe-api 
 * enable cost explorer apis
 *  https://docs.aws.amazon.com/cost-management/latest/userguide/billing-example-policies.html#example-policy-ce-api
 */


export type awsAccountUtilizationScenarios = 'hasPermissionsForPriceList' | 'hasPermissionsForCostExplorer';

export class awsAccountUtilization extends AwsServiceUtilization<awsAccountUtilizationScenarios> {
  constructor () {
    super();
  }

  doAction (
    _awsCredentialsProvider: AwsCredentialsProvider, _actionName: string, _resourceArn: string, _region: string
  ): void | Promise<void> {
    throw new Error('Method not implemented.');
  }

  async getUtilization (
    awsCredentialsProvider: AwsCredentialsProvider, regions: string[], _overrides: AwsServiceOverrides
  ): Promise<void> {
    const region = regions[0];
    await this.checkPermissionsForCostExplorer(awsCredentialsProvider, region);

    await this.checkPermissionsForPricing(awsCredentialsProvider, region);

  }


  async checkPermissionsForPricing (awsCredentialsProvider: AwsCredentialsProvider, region: string) {

    const pricingClient = new Pricing({ 
      credentials: await awsCredentialsProvider.getCredentials(),
      region: region
    });

    await pricingClient.describeServices({}).catch((e) => { 
      if(e.Code === 'AccessDeniedException'){ 
        this.addScenario('PriceListAPIs', 'hasPermissionsForPriceList', {
          value: 'false',
          optimize: {
            action: '', 
            isActionable: false,
            reason: 'This user does not have access to the Price List APIs'
          }
        });
      }
    });
  }

  async checkPermissionsForCostExplorer (awsCredentialsProvider: AwsCredentialsProvider, region: string){ 
    const costClient = new CostExplorer({
      credentials: await awsCredentialsProvider.getCredentials(),
      region: region
    });

    await costClient.getCostForecast({ 
      TimePeriod: { 
        Start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toString(), 
        End: Date.now().toString()
      }, 
      Granularity: 'DAILY', 
      Metric: 'BLENDED_COST'
    }).catch((e) => { 
      if(e.Code === 'AccessDeniedException'){ 
        this.addScenario('CostExplorerAPIs', 'hasPermissionsForCostExplorer', {
          value: 'false',
          optimize: { 
            action: '', 
            isActionable: false,
            reason: 'This user does not have access to Cost Explorer APIs'
          }
        });
      }
    });

  }

}