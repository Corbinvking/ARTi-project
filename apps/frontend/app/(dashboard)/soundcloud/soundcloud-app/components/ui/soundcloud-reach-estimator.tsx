"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon, TrendingUp } from 'lucide-react';

interface ReachEstimate {
  followers: number;
  reach_conservative: number;
  reach_median: number;
  reach_aggressive: number;
  reach_per_follower_median: number;
}

interface SoundCloudReachEstimatorProps {
  followers?: number;
  onEstimateChange?: (estimate: ReachEstimate | null) => void;
  showAdvanced?: boolean;
  className?: string;
}

function estimateReach(followers: number, reach_cap: number | null = null, round_to: number = 1000): ReachEstimate | null {
  const C = 16830.763237;
  const b = 0.396285;
  const q25 = -0.102;
  const q75 = 0.123;

  if (!Number.isFinite(followers) || followers < 1) return null;
  const f = Math.min(Math.floor(followers), 5_000_000);

  // median prediction
  const base = C * Math.pow(f, b);

  // convert log10 residual quantiles to multiplicative factors
  const loMult = Math.pow(10, q25); // ≈ 0.79
  const hiMult = Math.pow(10, q75); // ≈ 1.33

  let conservative = base * loMult;
  let median = base;
  let aggressive = base * hiMult;

  // Optional network ceiling
  if (reach_cap != null && Number.isFinite(reach_cap)) {
    conservative = Math.min(conservative, reach_cap);
    median = Math.min(median, reach_cap);
    aggressive = Math.min(aggressive, reach_cap);
  }

  // Rounding helper
  const roundTo = (x: number, n: number) => (n && n > 0) ? Math.round(x / n) * n : Math.round(x);

  return {
    followers: f,
    reach_conservative: roundTo(conservative, round_to),
    reach_median: roundTo(median, round_to),
    reach_aggressive: roundTo(aggressive, round_to),
    reach_per_follower_median: median / f
  };
}

export const SoundCloudReachEstimator: React.FC<SoundCloudReachEstimatorProps> = ({
  followers: initialFollowers = 0,
  onEstimateChange,
  showAdvanced = false,
  className = ""
}) => {
  const [followers, setFollowers] = useState(initialFollowers.toString());
  const [reachCap, setReachCap] = useState<string>('');
  const [roundTo, setRoundTo] = useState<string>('1000');
  const [estimate, setEstimate] = useState<ReachEstimate | null>(null);
  const [isExtrapolated, setIsExtrapolated] = useState(false);
  const [wasCapped, setWasCapped] = useState(false);

  useEffect(() => {
    const followerCount = parseInt(followers) || 0;
    const capValue = reachCap ? parseInt(reachCap) : null;
    const roundValue = parseInt(roundTo) || 1000;

    if (followerCount > 0) {
      const newEstimate = estimateReach(followerCount, capValue, roundValue);
      setEstimate(newEstimate);
      setIsExtrapolated(followerCount > 250000);
      
      // Check if values were capped
      if (newEstimate && capValue) {
        const uncappedMedian = estimateReach(followerCount, null, roundValue);
        setWasCapped(uncappedMedian ? uncappedMedian.reach_median > capValue : false);
      } else {
        setWasCapped(false);
      }

      onEstimateChange?.(newEstimate);
    } else {
      setEstimate(null);
      setIsExtrapolated(false);
      setWasCapped(false);
      onEstimateChange?.(null);
    }
  }, [followers, reachCap, roundTo, onEstimateChange]);

  const handleFollowersChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue <= 5_000_000) {
      setFollowers(value);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            SoundCloud Repost Reach Estimator
          </CardTitle>
          <CardDescription>
            Estimate repost reach based on follower count using our trained model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Input */}
          <div className="space-y-2">
            <Label htmlFor="followers">Followers</Label>
            <div className="flex items-center gap-2">
              <Input
                id="followers"
                type="number"
                placeholder="Enter follower count"
                value={followers}
                onChange={(e) => handleFollowersChange(e.target.value)}
                min="1"
                max="5000000"
                className="flex-1"
              />
              {isExtrapolated && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="w-4 h-4 text-orange-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Model trained below 250k; extrapolated with diminishing-returns curve.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">Advanced Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reachCap">Network cap (optional)</Label>
                  <Input
                    id="reachCap"
                    type="number"
                    placeholder="Leave empty for no cap"
                    value={reachCap}
                    onChange={(e) => setReachCap(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roundTo">Rounding (default 1,000)</Label>
                  <Input
                    id="roundTo"
                    type="number"
                    value={roundTo}
                    onChange={(e) => setRoundTo(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {estimate && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-sm text-orange-600 font-medium mb-1">Conservative</div>
                    <div className="text-2xl font-bold text-orange-700">
                      {formatNumber(estimate.reach_conservative)}
                    </div>
                    <div className="text-xs text-orange-600">25th percentile</div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-sm text-blue-600 font-medium mb-1">Median</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatNumber(estimate.reach_median)}
                    </div>
                    <div className="text-xs text-blue-600">50th percentile</div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-sm text-green-600 font-medium mb-1">Aggressive</div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatNumber(estimate.reach_aggressive)}
                    </div>
                    <div className="text-xs text-green-600">75th percentile</div>
                  </CardContent>
                </Card>
              </div>

              {/* Diagnostic Info */}
              <div className="text-sm text-muted-foreground text-center">
                Reach per follower (median): {estimate.reach_per_follower_median.toFixed(4)}
                {wasCapped && (
                  <Badge variant="outline" className="ml-2 text-orange-600 border-orange-600">
                    capped by network
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Utility function to get just the reach estimate without UI
export { estimateReach };