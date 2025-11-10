/**
 * Format numbers with K/M suffixes for better readability
 */
export const formatNumberWithSuffix = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
  }
  return num.toString();
};

/**
 * Format reach performance as "driven/goal" (e.g., "12M/20M")
 */
export const formatReachPerformance = (driven: number, goal: number): string => {
  return `${formatNumberWithSuffix(driven)}/${formatNumberWithSuffix(goal)}`;
};

/**
 * Calculate reach progress percentage
 */
export const calculateReachProgress = (driven: number, goal: number): number => {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (driven / goal) * 100));
};