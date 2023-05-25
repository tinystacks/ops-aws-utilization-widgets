import { Pricing } from '@aws-sdk/client-pricing';

export async function getInstanceCost (pricingClient: Pricing, instanceType: string) {
  const res = await pricingClient.getProducts({
    Filters: [
      {
        Type: 'TERM_MATCH',
        Field: 'instanceType',
        Value: instanceType
      },
      {
        Type: 'TERM_MATCH',
        Field: 'regionCode',
        Value: 'us-east-1'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'operatingSystem',
        Value: 'Linux'
      },
      {
        Type: 'TERM_MATCH',
        Field: 'usageType',
        Value: `BoxUsage:${instanceType}`
      },
      {
        Type: 'TERM_MATCH',
        Field: 'preInstalledSw',
        Value: 'NA'
      }
    ],
    ServiceCode: 'AmazonEC2'
  });

  const onDemandData = JSON.parse(res.PriceList[0] as string).terms.OnDemand;
  const onDemandKeys = Object.keys(onDemandData);
  const priceDimensionsData = onDemandData[onDemandKeys[0]].priceDimensions;
  const priceDimensionsKeys = Object.keys(priceDimensionsData);
  const pricePerHour = priceDimensionsData[priceDimensionsKeys[0]].pricePerUnit.USD;

  return pricePerHour * 24 * 30;
}