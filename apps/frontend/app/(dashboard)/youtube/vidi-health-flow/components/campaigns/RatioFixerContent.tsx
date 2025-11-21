import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertTriangle, Target, Clock, Play, Square, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { LIKE_SERVER_OPTIONS, COMMENT_SERVER_OPTIONS, SHEET_TIER_OPTIONS } from "../../lib/constants";
import { useRatioFixer } from "../../hooks/useRatioFixer";
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
  const { 
    healthStatus, 
    isAvailable, 
    startRatioFixer, 
    isStarting, 
    stopRatioFixer, 
    isStopping,
    useRatioFixerStatus 
  } = useRatioFixer();

  // Get ratio fixer status if campaign has one running
  const ratioFixerCampaignId = (campaign as any).ratio_fixer_campaign_id;
  const ratioFixerStatus = (campaign as any).ratio_fixer_status;
  const { data: fixerStatus, isLoading: isLoadingStatus } = useRatioFixerStatus(
    ratioFixerCampaignId,
    ratioFixerStatus === 'running'
  );

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

      {/* Automated Ratio Fixer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Automated Engagement Ordering
          </CardTitle>
          <CardDescription>
            Start the ratio fixer to automatically order likes and comments to maintain natural engagement ratios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Health Status */}
          {!isAvailable && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Ratio Fixer service is currently unavailable. {healthStatus?.error || 'Please check the service status.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Current Status */}
          {ratioFixerStatus === 'running' && fixerStatus && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="font-semibold">Ratio Fixer Active</span>
                </div>
                <Badge variant="default">Running</Badge>
              </div>
              
              {/* Live Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Target Likes:</span>
                  <span className="ml-2 font-medium">{fixerStatus.desired_likes?.toLocaleString() || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Comments:</span>
                  <span className="ml-2 font-medium">{fixerStatus.desired_comments?.toLocaleString() || 'N/A'}</span>
                </div>
                {fixerStatus.ordered_likes !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Ordered Likes:</span>
                    <span className="ml-2 font-medium text-primary">{fixerStatus.ordered_likes.toLocaleString()}</span>
                  </div>
                )}
                {fixerStatus.ordered_comments !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Ordered Comments:</span>
                    <span className="ml-2 font-medium text-primary">{fixerStatus.ordered_comments.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Stop Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (ratioFixerCampaignId) {
                    await stopRatioFixer(ratioFixerCampaignId);
                  }
                }}
                disabled={isStopping}
              >
                {isStopping ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Ratio Fixer
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Start Button */}
          {(!ratioFixerStatus || ratioFixerStatus === 'stopped' || ratioFixerStatus === 'idle') && (
            <div className="space-y-4">
              {/* Prerequisites Check */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Prerequisites:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    {formData.comments_sheet_url ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>Comments Sheet URL configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.like_server ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>Like Server selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.comment_server ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>Comment Server selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAvailable ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>Ratio Fixer service available</span>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <Button
                onClick={async () => {
                  if (!formData.comments_sheet_url) {
                    alert('Please configure Comments Sheet URL first');
                    return;
                  }
                  if (!formData.like_server || !formData.comment_server) {
                    alert('Please select Like Server and Comment Server first');
                    return;
                  }

                  await startRatioFixer({
                    campaignId: campaign.id,
                    videoUrl: campaign.youtube_url,
                    videoId: campaign.video_id || '',
                    genre: campaign.genre || 'General',
                    commentsSheetUrl: formData.comments_sheet_url,
                    waitTime: formData.wait_time_seconds || 36,
                    minimumEngagement: formData.minimum_engagement || 500,
                    commentServerId: parseInt(formData.comment_server || '439'),
                    likeServerId: parseInt(formData.like_server || '2324'),
                    sheetTier: formData.sheet_tier || '1847390823'
                  });
                }}
                disabled={
                  !isAvailable || 
                  !formData.comments_sheet_url || 
                  !formData.like_server || 
                  !formData.comment_server ||
                  isStarting
                }
                className="w-full"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting Ratio Fixer...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Automated Ratio Fixer
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="text-xs text-muted-foreground">
                <p>The ratio fixer will:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Monitor your video's engagement ratio every {formData.wait_time_seconds || 36} seconds</li>
                  <li>Automatically order likes and comments when ratios fall below target</li>
                  <li>Use ML-based predictions to calculate optimal engagement levels</li>
                  <li>Stop when the campaign is completed or manually stopped</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};