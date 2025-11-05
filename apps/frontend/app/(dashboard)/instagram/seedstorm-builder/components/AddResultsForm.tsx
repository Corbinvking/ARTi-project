import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign, CreatorResult } from "../lib/types";
import { updateCampaign } from "../lib/localStorage";
import { updateCreatorPerformance } from "../lib/campaignAlgorithm";
import { toast } from "../hooks/use-toast";

interface AddResultsFormProps {
  campaign: Campaign;
  onSuccess: () => void;
}

export const AddResultsForm = ({ campaign, onSuccess }: AddResultsFormProps) => {
  const [creatorResults, setCreatorResults] = useState<Record<string, {
    posts: { post_number: number; actual_views: string; }[];
  }>>(() => {
    const initialResults: Record<string, any> = {};
    if (campaign?.selected_creators) {
      campaign.selected_creators.forEach(creator => {
        const postsCount = creator.posts_count || 1;
        const existingResult = campaign.actual_results?.creator_results?.find(r => r.creator_id === creator.id);
        
        const posts = Array.from({ length: postsCount }, (_, index) => {
          const postNumber = index + 1;
          const existingPost = existingResult?.posts?.find(p => p.post_number === postNumber);
          return {
            post_number: postNumber,
            actual_views: existingPost?.actual_views?.toString() || ''
          };
        });

        initialResults[creator.id] = { posts };
      });
    }
    return initialResults;
  });

  const handlePostResultChange = (creatorId: string, postNumber: number, value: string) => {
    setCreatorResults(prev => ({
      ...prev,
      [creatorId]: {
        ...prev[creatorId],
        posts: prev[creatorId].posts.map(post => 
          post.post_number === postNumber 
            ? { ...post, actual_views: value }
            : post
        )
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalCreatorResults: CreatorResult[] = campaign.selected_creators.map(creator => {
      const result = creatorResults[creator.id];
      const posts = result.posts.map(post => ({
        post_number: post.post_number,
        actual_views: parseInt(post.actual_views) || Math.floor(creator.median_views_per_video / (creator.posts_count || 1)),
        actual_engagement_rate: creator.engagement_rate,
        notes: ''
      }));

      const totalActualViews = posts.reduce((sum, post) => sum + post.actual_views, 0);
      const averageEngagement = posts.reduce((sum, post) => sum + post.actual_engagement_rate, 0) / posts.length;

      updateCreatorPerformance(
        creator.id,
        {
          views: totalActualViews,
          engagement: averageEngagement,
          satisfaction: 8
        },
        {
          views: creator.median_views_per_video * (creator.posts_count || 1),
          engagement: creator.engagement_rate
        }
      );

      return {
        creator_id: creator.id,
        posts,
        total_actual_views: totalActualViews,
        average_engagement_rate: averageEngagement,
        notes: ''
      };
    });

    // Persist to DB: map actual_results to results internally
    updateCampaign(campaign.id, {
      status: 'Completed',
      actual_results: {
        executed: true,
        creator_results: finalCreatorResults,
        overall_satisfaction: 8
      }
    });

    toast({
      title: "Results Saved",
      description: "Campaign results have been recorded and creator performance updated",
    });

    onSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Save Button - Moved to top */}
      <div className="flex justify-end gap-3 pb-4 border-b">
        <Button onClick={handleSubmit} variant="gradient">
          Save Results
        </Button>
      </div>

      {/* Creator Results - Simplified to only Actual Views */}
      <Card>
        <CardHeader>
          <CardTitle>Creator Performance Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {campaign?.selected_creators && campaign.selected_creators.length > 0 ? campaign.selected_creators.map((creator, index) => {
              const postsCount = creator.posts_count || 1;
              const expectedViewsPerPost = Math.floor(creator.median_views_per_video / postsCount);
              
              return (
                <div key={creator.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">@{creator.instagram_handle}</h4>
                    <div className="text-sm text-muted-foreground">
                      {postsCount > 1 
                        ? `${postsCount} posts • ~${expectedViewsPerPost.toLocaleString()} views/post` 
                        : `Expected: ${creator.median_views_per_video.toLocaleString()} views`
                      }
                    </div>
                  </div>

                  <div className="space-y-3">
                    {creatorResults[creator.id]?.posts.map((post, postIndex) => (
                      <div key={post.post_number} className="space-y-2">
                        <Label htmlFor={`actual_views_${creator.id}_${post.post_number}`}>
                          {postsCount > 1 ? `Post ${post.post_number} - Actual Views` : 'Actual Views'}
                        </Label>
                        <Input
                          id={`actual_views_${creator.id}_${post.post_number}`}
                          type="number"
                          placeholder={expectedViewsPerPost.toString()}
                          value={post.actual_views || ''}
                          onChange={(e) => handlePostResultChange(creator.id, post.post_number, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No creators found in this campaign.</p>
                <p className="text-sm mt-2">This campaign may not have been properly saved with selected creators.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
