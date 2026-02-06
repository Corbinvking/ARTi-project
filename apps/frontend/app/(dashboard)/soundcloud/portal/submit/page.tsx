"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../soundcloud-app/contexts/AuthContext";
import { useMyMember } from "../../soundcloud-app/hooks/useMyMember";
import { supabase } from "../../soundcloud-app/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { 
  Upload, 
  Music, 
  Link as LinkIcon, 
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function SubmitTrackPage() {
  const { member: authMember } = useAuth();
  const { data: dbMember } = useMyMember();
  const member = dbMember || authMember;
  const { toast } = useToast();
  const router = useRouter();
  
  const [trackUrl, setTrackUrl] = useState("");
  const [artistName, setArtistName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);

  // Calculate remaining submissions
  const remainingSubmissions = member 
    ? (member.monthly_repost_limit || member.monthly_submission_limit || 0) - (member.submissions_this_month || 0)
    : 0;

  // Check if member's Influence Planner account is connected
  const ipStatus = (member as any)?.influence_planner_status;
  const isAccountConnected = ipStatus === 'connected' || ipStatus === 'LINKED' || ipStatus === 'active';
  const isAccountDisconnected = ipStatus === 'disconnected' || ipStatus === 'INVALID' || ipStatus === 'UNLINKED' || ipStatus === 'needs_reconnect';

  const validateSoundCloudUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/,
      /^https?:\/\/on\.soundcloud\.com\/[\w]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleUrlChange = (value: string) => {
    setTrackUrl(value);
    if (value.length > 10) {
      setIsValidating(true);
      // Debounce validation
      setTimeout(() => {
        setUrlValid(validateSoundCloudUrl(value));
        setIsValidating(false);
      }, 300);
    } else {
      setUrlValid(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member?.id) {
      toast({
        title: "Error",
        description: "Member data not found. Please try logging in again.",
        variant: "destructive"
      });
      return;
    }

    // Block submission if account is disconnected from Influence Planner
    if (isAccountDisconnected) {
      toast({
        title: "Account Not Connected",
        description: "Your SoundCloud account is not connected to the repost network. Please reconnect before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (remainingSubmissions <= 0) {
      toast({
        title: "Submission Limit Reached",
        description: "You've used all your submissions for this month.",
        variant: "destructive"
      });
      return;
    }

    if (!validateSoundCloudUrl(trackUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid SoundCloud track URL",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('soundcloud_submissions')
        .insert({
          member_id: member.id,
          track_url: trackUrl.trim(),
          artist_name: artistName.trim() || null,
          notes: notes.trim() || null,
          status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update member's submission count
      await supabase
        .from('soundcloud_members')
        .update({ 
          submissions_this_month: (member.submissions_this_month || 0) + 1,
          last_submission_at: new Date().toISOString()
        })
        .eq('id', member.id);

      toast({
        title: "Track Submitted!",
        description: "Your track has been submitted for review.",
      });

      // Redirect to history
      router.push('/soundcloud/portal/history');
      
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit your track. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Submit New Track</h1>
        <p className="text-muted-foreground">
          Share your SoundCloud track for repost consideration
        </p>
      </div>

      {/* Submission Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Monthly Submissions</p>
                <p className="text-sm text-muted-foreground">
                  {member.submissions_this_month || 0} / {member.monthly_repost_limit || member.monthly_submission_limit || 0} used
                </p>
              </div>
            </div>
            <Badge variant={remainingSubmissions > 0 ? "default" : "destructive"}>
              {remainingSubmissions} remaining
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Account Connection Warning */}
      {isAccountDisconnected && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Account Not Connected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your SoundCloud account is disconnected from the repost network. 
                  You must reconnect before submitting new tracks.
                </p>
                <Link href="/soundcloud/portal/profile">
                  <Button variant="outline" size="sm" className="mt-3">
                    Go to Profile to Reconnect
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Track Details
          </CardTitle>
          <CardDescription>
            Enter your SoundCloud track URL and optional details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Track URL */}
            <div className="space-y-2">
              <Label htmlFor="trackUrl">
                SoundCloud Track URL <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="trackUrl"
                  type="url"
                  placeholder="https://soundcloud.com/artist/track-name"
                  value={trackUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={remainingSubmissions <= 0}
                />
                {isValidating && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                )}
                {!isValidating && urlValid === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {!isValidating && urlValid === false && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                )}
              </div>
              {urlValid === false && (
                <p className="text-sm text-destructive">
                  Please enter a valid SoundCloud track URL
                </p>
              )}
              {trackUrl && urlValid && (
                <a 
                  href={trackUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Preview track <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Artist Name */}
            <div className="space-y-2">
              <Label htmlFor="artistName">Artist Name (Optional)</Label>
              <Input
                id="artistName"
                placeholder="Your artist name"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                disabled={remainingSubmissions <= 0}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use your member profile name
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information about your track..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={remainingSubmissions <= 0}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || remainingSubmissions <= 0 || !urlValid || isAccountDisconnected}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Track
                  </>
                )}
              </Button>
              <Link href="/soundcloud/portal">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>

            {remainingSubmissions <= 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">Monthly limit reached</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  You've used all your submissions for this month. Your limit will reset at the start of next month.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Submit only your own original tracks or official remixes
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Tracks must be publicly available on SoundCloud
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Allow up to 48 hours for review and approval
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Approved tracks will be scheduled for repost support
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

