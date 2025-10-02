"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  Calendar, 
  Target, 
  DollarSign, 
  Music,
  Globe,
  FileText,
  Sparkles,
  Check,
  X,
  TrendingUp
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  client_name: string;
  track_url: string;
  track_name?: string;
  stream_goal: number;
  budget: number;
  start_date: string;
  duration_days: number;
  music_genres: string[];
  territory_preferences: string[];
  content_types: string[];
  algorithm_recommendations: any;
  selected_playlists: any[];
  salesperson: string;
  created_at: string;
}

interface DraftCampaignReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign;
}

export function DraftCampaignReviewModal({ 
  open, 
  onOpenChange, 
  campaign 
}: DraftCampaignReviewModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approveCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          status: 'operator_review_complete',
          pending_operator_review: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['draft-campaigns'] });
      toast({
        title: "Campaign Approved",
        description: "Campaign approved and ready for building.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: "Failed to approve campaign. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleApprove = async () => {
    if (!campaign?.id) return;
    setIsApproving(true);
    try {
      await approveCampaignMutation.mutateAsync(campaign.id);
    } finally {
      setIsApproving(false);
    }
  };

  if (!campaign) return null;

  const recommendations = campaign.algorithm_recommendations || {};
  const allocations = recommendations.allocations || [];
  const insights = recommendations.insights || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Review Draft Campaign
          </DialogTitle>
          <DialogDescription>
            Review algorithm recommendations and approve campaign for building
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Campaign Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{campaign.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{campaign.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stream Goal</p>
                  <p className="font-medium flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {campaign.stream_goal.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    ${campaign.budget.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(campaign.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salesperson</p>
                  <p className="font-medium">{campaign.salesperson}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Music Genres</p>
                <div className="flex flex-wrap gap-1">
                  {campaign.music_genres.map(genre => (
                    <Badge key={genre} variant="secondary">{genre}</Badge>
                  ))}
                </div>
              </div>

              {campaign.territory_preferences.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Territory Preferences</p>
                  <div className="flex flex-wrap gap-1">
                    {campaign.territory_preferences.map(territory => (
                      <Badge key={territory} variant="outline">
                        <Globe className="w-3 h-3 mr-1" />
                        {territory}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {campaign.content_types.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Content Types</p>
                  <div className="flex flex-wrap gap-1">
                    {campaign.content_types.map(type => (
                      <Badge key={type} variant="outline">
                        <FileText className="w-3 h-3 mr-1" />
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Algorithm Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                AI Algorithm Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.confidence_score && (
                <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                  <span className="text-sm font-medium">Confidence Score</span>
                  <Badge variant="secondary">
                    {Math.round(insights.confidence_score * 100)}%
                  </Badge>
                </div>
              )}

              {allocations.length > 0 ? (
                <div className="space-y-3">
                  <p className="font-medium">Recommended Playlist Allocations</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {allocations.slice(0, 10).map((allocation: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {allocation.playlist_name || `Playlist ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {allocation.vendor_name || 'Unknown Vendor'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {allocation.allocated_streams?.toLocaleString() || '0'} streams
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${allocation.cost?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {allocations.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{allocations.length - 10} more playlists...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No playlist recommendations available</p>
                  <p className="text-sm">Algorithm may need more playlist data</p>
                </div>
              )}

              {insights.recommendations && Array.isArray(insights.recommendations) && (
                <div className="space-y-2">
                  <p className="font-medium">AI Insights</p>
                  <ul className="text-sm space-y-1">
                    {insights.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-accent hover:bg-accent/90"
            >
              {isApproving ? (
                "Approving..."
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Approve for Building
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}








