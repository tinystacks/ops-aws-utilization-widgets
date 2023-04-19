export const Arns = {
  NatGateway (region: string, accountId: string, natGatewayId: string) {
    return `arn:aws:ec2:${region}:${accountId}:natgateway/${natGatewayId}`;
  }
};