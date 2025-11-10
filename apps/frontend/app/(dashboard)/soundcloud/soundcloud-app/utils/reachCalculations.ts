import { estimateReach } from '../components/ui/soundcloud-reach-estimator';

/**
 * Calculate reach estimate for a member based on their follower count
 */
export const calculateMemberReach = (followerCount: number): number => {
  const estimate = estimateReach(followerCount);
  return estimate?.reach_median || 0;
};

/**
 * Calculate total reach for multiple members
 */
export const calculateTotalReach = (members: { soundcloud_followers: number }[]): number => {
  return members.reduce((total, member) => {
    return total + calculateMemberReach(member.soundcloud_followers);
  }, 0);
};

/**
 * Update submissions with realistic reach estimates using the power-law model
 */
export const updateSubmissionReachEstimate = (submission: any): any => {
  if (!submission.artist_name) return submission;
  
  // Use follower data to estimate reach if available
  const memberFollowers = submission.members?.soundcloud_followers || 25000;
  const estimate = estimateReach(memberFollowers);
  
  return {
    ...submission,
    expected_reach_planned: estimate?.reach_median || submission.expected_reach_planned
  };
};