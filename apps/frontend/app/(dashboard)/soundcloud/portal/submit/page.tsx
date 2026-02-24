"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ExternalLink,
  WifiOff,
} from "lucide-react";
import Link from "next/link";

interface SubGenre {
  id: string;
  name: string;
  family_name?: string;
}

export default function SubmitTrackPage() {
  const { member: authMember } = useAuth();
  const { data: dbMember } = useMyMember();
  const member = dbMember || authMember;
  const { toast } = useToast();
  const router = useRouter();

  const [songName, setSongName] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [supportDate, setSupportDate] = useState("");
  const [subGenre, setSubGenre] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const [subGenres, setSubGenres] = useState<SubGenre[]>([]);

  const remainingSubmissions = member
    ? (member.monthly_repost_limit || member.monthly_submission_limit || 0) -
      (member.submissions_this_month || 0)
    : 0;

  const ipStatus = (member as any)?.influence_planner_status;
  const isDisconnected =
    ipStatus === "disconnected" ||
    ipStatus === "INVALID" ||
    ipStatus === "UNLINKED" ||
    ipStatus === "needs_reconnect";

  useEffect(() => {
    const fetchSubGenres = async () => {
      const { data: families } = await supabase
        .from("genre_families")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (families && families.length > 0) {
        setSubGenres(
          families.map((f: any) => ({ id: f.id, name: f.name }))
        );
      }
    };
    fetchSubGenres();
  }, []);

  const validateSoundCloudUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/,
      /^https?:\/\/on\.soundcloud\.com\/[\w]+/,
    ];
    return patterns.some((p) => p.test(url));
  };

  const handleUrlChange = (value: string) => {
    setTrackUrl(value);
    if (value.length > 10) {
      setUrlValid(validateSoundCloudUrl(value));
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
        variant: "destructive",
      });
      return;
    }

    if (isDisconnected) {
      toast({
        title: "Account Not Connected",
        description:
          "Your SoundCloud account is disconnected. Please reconnect before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (remainingSubmissions <= 0) {
      toast({
        title: "Submission Limit Reached",
        description: "You've used all your submissions for this month.",
        variant: "destructive",
      });
      return;
    }

    if (!validateSoundCloudUrl(trackUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid SoundCloud track URL",
        variant: "destructive",
      });
      return;
    }

    if (!songName.trim()) {
      toast({
        title: "Missing Song Name",
        description: "Please enter your song name.",
        variant: "destructive",
      });
      return;
    }

    if (!subGenre) {
      toast({
        title: "Missing Sub-Genre",
        description: "Please select a sub-genre.",
        variant: "destructive",
      });
      return;
    }

    if (supportDate) {
      const sd = new Date(supportDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sd < today) {
        toast({
          title: "Invalid Support Date",
          description: "Requested support date must be in the future.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const selectedGenre = subGenres.find((g) => g.id === subGenre);

      const { error } = await supabase.from("soundcloud_submissions").insert({
        member_id: member.id,
        track_name: songName.trim(),
        track_url: trackUrl.trim(),
        artist_name: member.name || null,
        release_date: releaseDate || null,
        support_date: supportDate || null,
        family: selectedGenre?.name || null,
        subgenres: selectedGenre ? [selectedGenre.name] : [],
        notes: notes.trim() || null,
        status: "pending",
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;

      await supabase
        .from("soundcloud_members")
        .update({
          submissions_this_month: (member.submissions_this_month || 0) + 1,
          last_submission_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      toast({
        title: "Track Submitted!",
        description: "Your track has been submitted for review.",
      });

      router.push("/soundcloud/portal/history");
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description:
          error.message || "Could not submit your track. Please try again.",
        variant: "destructive",
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
                  {member.submissions_this_month || 0} /{" "}
                  {member.monthly_repost_limit ||
                    member.monthly_submission_limit ||
                    0}{" "}
                  used
                </p>
              </div>
            </div>
            <Badge
              variant={remainingSubmissions > 0 ? "default" : "destructive"}
            >
              {remainingSubmissions} remaining
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Connection Warning */}
      {isDisconnected && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <WifiOff className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Account Not Connected
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your SoundCloud account is disconnected from the repost
                  network. You must reconnect before submitting new tracks.
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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Song Name */}
            <div className="space-y-2">
              <Label htmlFor="songName">
                Song Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="songName"
                placeholder="My Track Title"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                required
                disabled={remainingSubmissions <= 0}
              />
            </div>

            {/* Track URL */}
            <div className="space-y-2">
              <Label htmlFor="trackUrl">
                SoundCloud URL <span className="text-destructive">*</span>
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
                {urlValid === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {urlValid === false && (
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

            {/* Sub-Genre */}
            <div className="space-y-2">
              <Label>
                Sub-Genre <span className="text-destructive">*</span>
              </Label>
              <Select
                value={subGenre}
                onValueChange={setSubGenre}
                disabled={remainingSubmissions <= 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-genre" />
                </SelectTrigger>
                <SelectContent>
                  {subGenres.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="releaseDate">
                  Release Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="releaseDate"
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  required
                  disabled={remainingSubmissions <= 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportDate">
                  Requested Support Date{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supportDate"
                  type="date"
                  value={supportDate}
                  onChange={(e) => setSupportDate(e.target.value)}
                  required
                  disabled={remainingSubmissions <= 0}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional info..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={remainingSubmissions <= 0}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  remainingSubmissions <= 0 ||
                  !urlValid ||
                  isDisconnected
                }
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
                  Your limit will reset at the start of next month.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
