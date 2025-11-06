import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, AlertTriangle, Target, Clock } from "lucide-react";
import { LIKE_SERVER_OPTIONS, COMMENT_SERVER_OPTIONS, SHEET_TIER_OPTIONS } from "../../lib/constants";
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { name: string; company: string } | null;
};

interface RatioFixerContentProps {
  campaign: Campaign | null;
  formData: any;
  onInputChange: (field: string, value: string) => void;
}

export const RatioFixerContent = ({ campaign, formData, onInputChange }: RatioFixerContentProps) => {

  if (!campaign) return null;

  // Calculate expected engagement based on industry standards
  const calculateExpectedEngagement = () => {
    const views = campaign.current_views || 0;
    
    // Industry benchmarks by genre (example ratios)
    const genreRatios = {
      'Pop': { likeRate: 0.02, commentRate: 0.002 },
      'Rock': { likeRate: 0.025, commentRate: 0.003 },
      'Electronic': { likeRate: 0.018, commentRate: 0.0015 },
      'Hip Hop': { likeRate: 0.022, commentRate: 0.0025 },
      'EDM': { likeRate: 0.018, commentRate: 0.0015 },
      'Latin': { likeRate: 0.021, commentRate: 0.002 },
      'Dubstep': { likeRate: 0.019, commentRate: 0.0018 },
      'House': { likeRate: 0.017, commentRate: 0.0014 },
      'R&B': { likeRate: 0.023, commentRate: 0.0026 },
      'default': { likeRate: 0.02, commentRate: 0.002 }
    };

    const ratios = genreRatios[campaign.genre as keyof typeof genreRatios] || genreRatios.default;
    
    return {
      expectedLikes: Math.floor(views * ratios.likeRate),
      expectedComments: Math.floor(views * ratios.commentRate),
      currentLikes: campaign.current_likes || 0,
      currentComments: campaign.current_comments || 0
    };
  };

  const { expectedLikes, expectedComments, currentLikes, currentComments } = calculateExpectedEngagement();

  const likesRatio = expectedLikes > 0 ? (currentLikes / expectedLikes) * 100 : 0;
  const commentsRatio = expectedComments > 0 ? (currentComments / expectedComments) * 100 : 0;

  const getRatioColor = (ratio: number) => {
    if (ratio >= 90) return "text-success";
    if (ratio >= 70) return "text-warning";
    return "text-destructive";
  };

  const getRatioIcon = (ratio: number) => {
    if (ratio >= 90) return <TrendingUp className="h-4 w-4 text-success" />;
    if (ratio >= 70) return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const addToFixerQueue = async (priority: 'low' | 'medium' | 'high') => {
    // Removed - functionality moved to dashboard
  };

  return (
    <div className="space-y-4">
      {/* Engagements Only Banner */}
      {campaign.service_type === 'engagements_only' && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-primary mb-1">Engagements Only Campaign</h4>
              <p className="text-sm text-muted-foreground">
                This campaign dynamically calculates optimal engagement targets based on the video's current view count. 
                YouTube stats are collected 3 times daily to ensure accurate engagement ratios.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Views</span>
                <span className="font-bold text-lg">{campaign.current_views?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Likes</span>
                <span className="font-bold">{currentLikes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Comments</span>
                <span className="font-bold">{currentComments.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expected Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expected Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Genre</span>
                <Badge variant="secondary">{campaign.genre || 'General'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Expected Likes</span>
                <span className="font-bold">{expectedLikes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Expected Comments</span>
                <span className="font-bold">{expectedComments.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ratio Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Engagement Ratio Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Likes Ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRatioIcon(likesRatio)}
                <span className="font-medium">Likes Ratio</span>
              </div>
              <span className={`font-bold ${getRatioColor(likesRatio)}`}>
                {likesRatio.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(likesRatio, 100)} className="h-2" />
            <div className="text-sm text-muted-foreground">
              Gap: {Math.max(0, expectedLikes - currentLikes).toLocaleString()} likes needed
            </div>
          </div>

          {/* Comments Ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRatioIcon(commentsRatio)}
                <span className="font-medium">Comments Ratio</span>
              </div>
              <span className={`font-bold ${getRatioColor(commentsRatio)}`}>
                {commentsRatio.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(commentsRatio, 100)} className="h-2" />
            <div className="text-sm text-muted-foreground">
              Gap: {Math.max(0, expectedComments - currentComments).toLocaleString()} comments needed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {likesRatio < 70 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Critical: Likes significantly below expected ratio
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Immediate action required to boost likes engagement
                </p>
              </div>
            )}
            {commentsRatio < 70 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Critical: Comments significantly below expected ratio
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Consider engagement campaigns to increase comments
                </p>
              </div>
            )}
            {likesRatio >= 70 && likesRatio < 90 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 text-warning font-medium">
                  <Clock className="h-4 w-4" />
                  Moderate: Likes ratio could be improved
                </div>
              </div>
            )}
            {commentsRatio >= 70 && commentsRatio < 90 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 text-warning font-medium">
                  <Clock className="h-4 w-4" />
                  Moderate: Comments ratio could be improved
                </div>
              </div>
            )}
            {likesRatio >= 90 && commentsRatio >= 90 && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 text-success font-medium">
                  <TrendingUp className="h-4 w-4" />
                  Excellent: Both ratios are performing well
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Campaign is meeting engagement expectations
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Server Configuration for Ratio Fixer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ratio Fixer Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comments_sheet_url">Comments Sheet URL</Label>
            <Input
              id="comments_sheet_url"
              value={formData.comments_sheet_url}
              onChange={(e) => onInputChange('comments_sheet_url', e.target.value)}
              placeholder="Enter comments sheet URL for engagement tracking"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="like_server">Like Server</Label>
              <Select value={formData.like_server} onValueChange={(value) => onInputChange('like_server', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {LIKE_SERVER_OPTIONS.map((server) => (
                    <SelectItem key={server} value={server}>
                      {server}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment_server">Comment Server</Label>
              <Select value={formData.comment_server} onValueChange={(value) => onInputChange('comment_server', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {COMMENT_SERVER_OPTIONS.map((server) => (
                    <SelectItem key={server} value={server}>
                      {server}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet_tier">Sheet Tier</Label>
              <Select value={formData.sheet_tier} onValueChange={(value) => onInputChange('sheet_tier', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {SHEET_TIER_OPTIONS.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
};