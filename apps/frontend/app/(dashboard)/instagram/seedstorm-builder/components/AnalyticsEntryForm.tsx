import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "../integrations/supabase/client";
import { toast } from "../hooks/use-toast";

interface AnalyticsEntryFormProps {
  creator: {
    id: string;
    instagram_handle: string;
    median_views_per_video: number;
    engagement_rate: number;
    updated_at?: string;
  };
  onSuccess: () => void;
}

export const AnalyticsEntryForm = ({ creator, onSuccess }: AnalyticsEntryFormProps) => {
  const [formData, setFormData] = useState({
    median_views_per_video: creator.median_views_per_video.toString(),
    engagement_rate: creator.engagement_rate.toString(),
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.median_views_per_video || parseInt(formData.median_views_per_video) <= 0) {
      newErrors.median_views_per_video = 'Valid median views is required';
    }
    if (!formData.engagement_rate || parseFloat(formData.engagement_rate) <= 0) {
      newErrors.engagement_rate = 'Valid engagement rate is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors and try again",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Update creator analytics in database with auto-generated timestamp
      const { error } = await supabase
        .from('creators')
        .update({
          median_views_per_video: parseInt(formData.median_views_per_video),
          engagement_rate: parseFloat(formData.engagement_rate),
          updated_at: new Date().toISOString()
        })
        .eq('id', creator.id);

      if (error) throw error;

      // If notes are provided, we could store them in a separate analytics_notes table
      // For now, we'll just show success message
      if (formData.notes.trim()) {
        // TODO: Could implement analytics_notes table for tracking notes
        console.log('Analytics notes:', formData.notes);
      }

      toast({
        title: "Analytics Updated",
        description: `Analytics for @${creator.instagram_handle} have been updated`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error updating creator analytics:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update creator analytics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Analytics Entry Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Creator Display */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Creator</Label>
            <div className="text-sm text-muted-foreground">@{creator.instagram_handle}</div>
          </div>

          {/* Recent Median Views */}
          <div className="space-y-2">
            <Label htmlFor="median_views">Recent Median Views</Label>
            <Input
              id="median_views"
              type="number"
              placeholder="45000"
              value={formData.median_views_per_video}
              onChange={(e) => setFormData(prev => ({...prev, median_views_per_video: e.target.value}))}
              className={errors.median_views_per_video ? 'border-destructive' : ''}
            />
            {errors.median_views_per_video && (
              <p className="text-sm text-destructive">{errors.median_views_per_video}</p>
            )}
          </div>

          {/* Current Engagement Rate */}
          <div className="space-y-2">
            <Label htmlFor="engagement_rate">Current Engagement Rate (%)</Label>
            <Input
              id="engagement_rate"
              type="number"
              step="0.1"
              placeholder="4.2"
              value={formData.engagement_rate}
              onChange={(e) => setFormData(prev => ({...prev, engagement_rate: e.target.value}))}
              className={errors.engagement_rate ? 'border-destructive' : ''}
            />
            {errors.engagement_rate && (
              <p className="text-sm text-destructive">{errors.engagement_rate}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes about recent performance..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
              rows={3}
            />
          </div>

          {/* Last Updated (Read-only) */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Last Updated</Label>
            <div className="text-sm text-muted-foreground">
              {formatLastUpdated(creator.updated_at)}
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Analytics'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};