import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, AlertTriangle, Target, Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { name: string; company: string } | null;
};

interface RatioFixerModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RatioFixerModal = ({ campaign, isOpen, onClose }: RatioFixerModalProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ratio_fixer_queue')
        .insert({
          campaign_id: campaign.id,
          priority,
          status: 'waiting'
        });

      if (error) throw error;

      await supabase
        .from('campaigns')
        .update({ in_fixer: true })
        .eq('id', campaign.id);

      toast({
        title: "Added to Ratio Fixer Queue",
        description: `Campaign "${campaign.campaign_name}" has been added to the queue with ${priority} priority.`,
      });

      onClose();
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast({
        title: "Error",
        description: "Failed to add campaign to ratio fixer queue.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ratio Fixer Analysis - {campaign.campaign_name}
          </DialogTitle>
        </DialogHeader>

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

          {/* Ratio Analysis */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Engagement Ratio Analysis</CardTitle>
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
          <Card className="md:col-span-2">
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

          {/* Actions */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Campaign Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any specific notes or requirements for this campaign..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => addToFixerQueue('high')}
                  disabled={loading || campaign.in_fixer}
                  variant="destructive"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  High Priority Queue
                </Button>
                <Button
                  onClick={() => addToFixerQueue('medium')}
                  disabled={loading || campaign.in_fixer}
                  variant="default"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Medium Priority Queue
                </Button>
                <Button
                  onClick={() => addToFixerQueue('low')}
                  disabled={loading || campaign.in_fixer}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Low Priority Queue
                </Button>
              </div>

              {campaign.in_fixer && (
                <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                  <div className="text-info font-medium text-sm">
                    Campaign is already in the ratio fixer queue
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};