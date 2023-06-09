// export type ResourceCosts = { [ resourceId: string ]: {
//   cost: number,
//   service: string
// }};

// export type CostPerResourceReport = {
//   resourceCosts: { [ resourceId: string ]: {
//     cost: number,
//     service: string 
//   }},
//   hasCostReportDefinition: boolean,
//   hasCostReport: boolean
// };

export type ServiceInformation = {
  serviceCost: number,
  resourceCosts: { [ resourceId: string ]: number },
  details?: string,
  displayName?: string
};

export type ResourcesPerService = {
  [ serviceName: string ]: ServiceInformation
};

export type CostReport = {
  report: ResourcesPerService,
  hasCostReportDefinition: boolean,
  hasCostReport: boolean
};

export const serviceNamesMap: { [ key: string ]: string } = {
  amplifyBackend: 'AWS Amplify',
  amplifyuibuilder: 'AWS Amplify',
  amplify: 'AWS Amplify',
  backup: 'AWS Backup',
  'backup-gateway': 'AWS Backup',
  'backup-storage': 'AWS Backup',
  servicediscovery: 'AWS Cloud Map',
  cloudtrail: 'AWS CloudTrail',
  rum: 'AWS CloudTrail',
  codepipeline: 'AWS CodePipeline',
  ce: 'AWS Cost Explorer',
  glue: 'AWS Glue',
  databrew: 'AWS Glue',
  kms: 'AWS Key Management Service',
  lambda: 'AWS Lambda',
  secretsmanager: 'AWS Secrets Manager',
  securityhub: 'AWS Security Hub',
  states: 'AWS Step Functions',
  'ssm-contacts': 'AWS Systems Manager',
  'ssm-incidents': 'AWS Systems Manager',
  ssm: 'AWS Systems Manager',
  'waf-regional': 'AWS WAF',
  wafv2: 'AWS WAF',
  waf: 'AWS WAF',
  apigateway: 'Amazon API Gateway',
  'execute-api': 'Amazon API Gateway',
  cloudfront: 'Amazon CloudFront',
  'cognito-identity': 'Amazon Cognito',
  'cognito-sync': 'Amazon Cognito',
  'cognito-idp': 'Amazon Cognito',
  dax: 'Amazon DynamoDB',
  dynamodb: 'Amazon DynamoDB',
  ecr: 'Amazon EC2 Container Registry (ECR)',
  ebs: 'EC2 - Other',
  natGateway: 'EC2 - Other',
  ec2: 'Amazon Elastic Compute Cloud - Compute',
  autoscaling: 'Amazon Elastic Compute Cloud - Compute',
  'ecr-public': 'Amazon Elastic Container Registry Public',
  ecs: 'Amazon Elastic Container Service',
  elasticfilesystem: 'Amazon Elastic File System',
  elasticloadbalancing: 'Amazon Elastic Load Balancing',
  glacier: 'Amazon Glacier',
  guardduty: 'Amazon GuardDuty',
  inspector2: 'Amazon Inspector',
  'rds-db': 'Amazon Relational Database Service',
  rds: 'Amazon Relational Database Service',
  'route53-recovery-cluster': 'Amazon Route 53',
  'route53-recovery-control-config': 'Amazon Route 53',
  'route53-recovery-readiness': 'Amazon Route 53',
  'route53resolver': 'Amazon Route 53',
  route53: 'Amazon Route 53',
  sns: 'Amazon Simple Notification Service',
  sqs: 'Amazon Simple Queue Service',
  's3-object-lambda': 'Amazon Simple Storage Service',
  's3-outposts': 'Amazon Simple Storage Service',
  's3': 'Amazon Simple Storage Service',
  cloudwatch: 'AmazonCloudWatch',
  logs: 'AmazonCloudWatch',
  codebuild: 'CodeBuild'
};