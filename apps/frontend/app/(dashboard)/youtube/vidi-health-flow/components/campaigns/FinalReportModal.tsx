import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, Heart, MessageCircle, Users, Calendar, Target, CheckCircle2, Download, Mail, Copy } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  campaign_name: string;
  youtube_url: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  goal_views?: number | null;
  current_views?: number | null;
  current_likes?: number | null;
  current_comments?: number | null;
  total_subscribers?: number | null;
  client_notes?: string | null;
  like_goal?: number | null;
  comment_goal?: number | null;
  genre?: string | null;
}

interface FinalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}

export const FinalReportModal = ({ isOpen, onClose, campaign }: FinalReportModalProps) => {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  if (!campaign) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const calculateProgress = (current: number | null | undefined, goal: number | null | undefined) => {
    if (!goal || goal === 0) return 0;
    return Math.min(Math.round(((current || 0) / goal) * 100), 100);
  };

  const viewsProgress = calculateProgress(campaign.current_views, campaign.goal_views);
  const likesProgress = calculateProgress(campaign.current_likes, campaign.like_goal);
  const commentsProgress = calculateProgress(campaign.current_comments, campaign.comment_goal);

  const handleCopyReport = async () => {
    setCopying(true);
    try {
      const reportText = generateReportText();
      await navigator.clipboard.writeText(reportText);
      toast({
        title: "Report Copied",
        description: "The campaign report has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCopying(false);
    }
  };

  const generateReportText = () => {
    let report = `CAMPAIGN COMPLETION REPORT\n`;
    report += `${'='.repeat(40)}\n\n`;
    report += `Campaign: ${campaign.campaign_name}\n`;
    report += `Video: ${campaign.youtube_url}\n`;
    report += `Status: Completed\n\n`;
    
    if (campaign.start_date || campaign.end_date) {
      report += `Campaign Period:\n`;
      if (campaign.start_date) {
        report += `  Start: ${format(new Date(campaign.start_date), 'MMM dd, yyyy')}\n`;
      }
      if (campaign.end_date) {
        report += `  End: ${format(new Date(campaign.end_date), 'MMM dd, yyyy')}\n`;
      }
      report += `\n`;
    }
    
    report += `FINAL RESULTS\n`;
    report += `${'-'.repeat(20)}\n`;
    report += `Views: ${formatNumber(campaign.current_views || 0)}`;
    if (campaign.goal_views) {
      report += ` / ${formatNumber(campaign.goal_views)} (${viewsProgress}%)`;
    }
    report += `\n`;
    
    report += `Likes: ${formatNumber(campaign.current_likes || 0)}`;
    if (campaign.like_goal) {
      report += ` / ${formatNumber(campaign.like_goal)} (${likesProgress}%)`;
    }
    report += `\n`;
    
    report += `Comments: ${formatNumber(campaign.current_comments || 0)}`;
    if (campaign.comment_goal) {
      report += ` / ${formatNumber(campaign.comment_goal)} (${commentsProgress}%)`;
    }
    report += `\n\n`;
    
    if (campaign.client_notes) {
      report += `NOTES\n`;
      report += `${'-'.repeat(20)}\n`;
      report += `${campaign.client_notes}\n\n`;
    }
    
    report += `${'='.repeat(40)}\n`;
    report += `Report generated on ${format(new Date(), 'MMM dd, yyyy at h:mm a')}\n`;
    
    return report;
  };

  const handleEmailReport = () => {
    const subject = encodeURIComponent(`Campaign Report: ${campaign.campaign_name}`);
    const body = encodeURIComponent(generateReportText());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Campaign Completion Report
          </DialogTitle>
          <DialogDescription>
            Final results and summary for {campaign.campaign_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{campaign.campaign_name}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default" className="bg-green-500">Completed</Badge>
                {campaign.genre && <Badge variant="outline">{campaign.genre}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <a 
                  href={campaign.youtube_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {campaign.youtube_url}
                </a>
              </div>
              {(campaign.start_date || campaign.end_date) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {campaign.start_date && format(new Date(campaign.start_date), 'MMM dd, yyyy')}
                  {campaign.start_date && campaign.end_date && ' — '}
                  {campaign.end_date && format(new Date(campaign.end_date), 'MMM dd, yyyy')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">
                    {campaign.goal_views ? `${viewsProgress}%` : '—'}
                  </span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {formatNumber(campaign.current_views || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Views</div>
                {campaign.goal_views && (
                  <div className="text-xs text-muted-foreground">
                    Goal: {formatNumber(campaign.goal_views)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">
                    {campaign.like_goal ? `${likesProgress}%` : '—'}
                  </span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {formatNumber(campaign.current_likes || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Likes</div>
                {campaign.like_goal && (
                  <div className="text-xs text-muted-foreground">
                    Goal: {formatNumber(campaign.like_goal)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    {campaign.comment_goal ? `${commentsProgress}%` : '—'}
                  </span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {formatNumber(campaign.current_comments || 0)}
                </div>
                <div className="text-xs text-muted-foreground">Comments</div>
                {campaign.comment_goal && (
                  <div className="text-xs text-muted-foreground">
                    Goal: {formatNumber(campaign.comment_goal)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold mt-1">
                  {campaign.total_subscribers ? formatNumber(campaign.total_subscribers) : '—'}
                </div>
                <div className="text-xs text-muted-foreground">Subscribers</div>
              </CardContent>
            </Card>
          </div>

          {/* Client Notes - Only shown if present */}
          {campaign.client_notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{campaign.client_notes}</p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Report generated on {format(new Date(), 'MMM dd, yyyy at h:mm a')}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyReport} disabled={copying}>
                <Copy className="h-4 w-4 mr-2" />
                {copying ? 'Copying...' : 'Copy Report'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleEmailReport}>
                <Mail className="h-4 w-4 mr-2" />
                Email Report
              </Button>
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
