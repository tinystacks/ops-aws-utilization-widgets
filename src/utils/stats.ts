import * as stats from 'simple-statistics';
import { StabilityStats, StabilityStatsOptions } from '../types/types';
import isEmpty from 'lodash.isempty';
/**
 * 
 * @param dataSet - The data to run stats on.
 * @param options - {@link StabilityStatsOptions}
 * @returns - {@link StabilityStats}
 */
export function getStabilityStats (dataSet: number[], options?: StabilityStatsOptions): StabilityStats {
  const {
    removeOutliers = false,
    outlierZScore = 5,
    anomalyThreshold = 0.5,
    stabilityZScore = 3
  } = options || {};

  if (isEmpty(dataSet)) {
    return {
      mean: 0,
      max: 0,
      maxZScore: 0,
      standardDeviation: 0,
      wasFiltered: false,
      isStable: false
    };
  }

  let wasFiltered = removeOutliers;
  const mean = stats.mean(dataSet);
  const stdev = stats.standardDeviation(dataSet);
  let filteredDataSet = dataSet;
  let anomalyPercentage;
  if (removeOutliers) {
    const nonAnomolousData = dataSet.filter(val => stats.zScore(val, mean, stdev) < outlierZScore);
    const dataSetSize = dataSet.length;
    const anomolousDataSize = dataSetSize - nonAnomolousData.length;
    anomalyPercentage = (anomolousDataSize / dataSetSize) * 100;
    if (anomalyPercentage < anomalyThreshold) {
      filteredDataSet = nonAnomolousData;
    } else {
      wasFiltered = false;
    }
  }
  const filteredMean = stats.mean(filteredDataSet);
  const filteredStdev = stats.standardDeviation(filteredDataSet);
  const max = stats.max(filteredDataSet);
  const maxZScore = stats.zScore(max, filteredMean, filteredStdev);
  const isStable = maxZScore < stabilityZScore;
  const anomalyPercentageString = anomalyPercentage ? `${Math.round(anomalyPercentage * 10000) / 10000}%` : undefined;
  return {
    mean: filteredMean,
    max,
    maxZScore,
    standardDeviation: filteredStdev,
    anomalyPercentage: anomalyPercentageString,
    wasFiltered,
    isStable
  };
}