import { Widget } from '@tinystacks/ops-model';
import { AwsResourceType, Utilization } from '../types/types.js';

export type RecommendationsActionsSummaryProps = Widget & {
  utilization: { [key: AwsResourceType | string]: Utilization<string> };
  deleteLink?: string;
  optimizeLink?: string;
  scaleDownLink?: string;
};