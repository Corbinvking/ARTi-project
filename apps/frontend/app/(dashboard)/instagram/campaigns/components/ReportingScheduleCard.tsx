"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Send, Clock, CheckCircle, AlertCircle, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/auth";

interface ReportingScheduleCardProps {
  campaign: {
    id: string | number;
    campaign?: string;
    status?: string;
    final_report_sent_at?: string | null;
    followup_report_date?: string | null;
    followup_report_sent_at?: string | null;
    send_final_report?: string;
  };
  onUpdate: () => void;
}

export function ReportingScheduleCard({ campaign, onUpdate }: ReportingScheduleCardProps) {
  const { toast } = useToast();
  const [isSendingFinal, setIsSendingFinal] = useState(false);
  const [isSendingFollowup, setIsSendingFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState(campaign.followup_report_date || "");

  // Calculate default follow-up date (14 days from now or final report date)
  const getDefaultFollowupDate = () => {
    const baseDate = campaign.final_report_sent_at 
      ? new Date(campaign.final_report_sent_at)
      : new Date();
    baseDate.setDate(baseDate.getDate() + 14);
    return baseDate.toISOString().split('T')[0];
  };

  // Send final report
  const handleSendFinalReport = async () => {
    setIsSendingFinal(true);
    try {
      const { error } = await supabase
        .from('instagram_campaigns')
        .update({
          final_report_sent_at: new Date().toISOString(),
          send_final_report: 'checked',
          status: 'complete'
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Final Report Marked as Sent",
        description: "Campaign marked as complete. Remember to schedule the follow-up report.",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive",
      });
    } finally {
      setIsSendingFinal(false);
    }
  };

  // Schedule or update follow-up report date
  const handleScheduleFollowup = async () => {
    if (!followupDate) {
      toast({
        title: "Date Required",
        description: "Please select a follow-up report date",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('instagram_campaigns')
        .update({
          followup_report_date: followupDate
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Follow-up Scheduled",
        description: `Follow-up report scheduled for ${new Date(followupDate).toLocaleDateString()}`,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule follow-up report",
        variant: "destructive",
      });
    }
  };

  // Send follow-up report
  const handleSendFollowupReport = async () => {
    setIsSendingFollowup(true);
    try {
      const { error } = await supabase
        .from('instagram_campaigns')
        .update({
          followup_report_sent_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Follow-up Report Sent",
        description: "Campaign reporting cycle complete!",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow-up report status",
        variant: "destructive",
      });
    } finally {
      setIsSendingFollowup(false);
    }
  };

  const isFinalReportSent = !!campaign.final_report_sent_at || campaign.send_final_report === 'checked';
  const isFollowupScheduled = !!campaign.followup_report_date;
  const isFollowupSent = !!campaign.followup_report_sent_at;

  // Check if follow-up is due (within 3 days)
  const isFollowupDue = isFollowupScheduled && !isFollowupSent && 
    new Date(campaign.followup_report_date!) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return (
    <Card className="border-blue-500/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          Reporting Schedule
        </CardTitle>
        <CardDescription>
          Manage final and follow-up reports for this campaign
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Final Report Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Final Report</Label>
            </div>
            {isFinalReportSent ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sent {campaign.final_report_sent_at && new Date(campaign.final_report_sent_at).toLocaleDateString()}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
          
          {!isFinalReportSent && (
            <Button
              onClick={handleSendFinalReport}
              disabled={isSendingFinal}
              className="w-full"
              variant="outline"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSendingFinal ? "Sending..." : "Mark Final Report as Sent"}
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Follow-up Report Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Follow-up Report (2-3 weeks later)</Label>
            </div>
            {isFollowupSent ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sent
              </Badge>
            ) : isFollowupDue ? (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Due Soon
              </Badge>
            ) : isFollowupScheduled ? (
              <Badge variant="outline" className="border-blue-500/50 text-blue-600">
                <Clock className="h-3 w-3 mr-1" />
                Scheduled
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-500/50 text-gray-600">
                Not Scheduled
              </Badge>
            )}
          </div>

          {!isFollowupSent && (
            <>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  min={campaign.final_report_sent_at 
                    ? new Date(new Date(campaign.final_report_sent_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]
                  }
                  className="flex-1"
                />
                <Button
                  onClick={handleScheduleFollowup}
                  variant="outline"
                  disabled={!followupDate}
                >
                  Schedule
                </Button>
              </div>

              {isFollowupScheduled && (
                <Button
                  onClick={handleSendFollowupReport}
                  disabled={isSendingFollowup}
                  className="w-full"
                  variant={isFollowupDue ? "default" : "outline"}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSendingFollowup ? "Sending..." : "Mark Follow-up Report as Sent"}
                </Button>
              )}
            </>
          )}

          {isFollowupScheduled && !isFollowupSent && (
            <p className="text-xs text-muted-foreground">
              Scheduled for {new Date(campaign.followup_report_date!).toLocaleDateString()}
            </p>
          )}

          {isFollowupSent && campaign.followup_report_sent_at && (
            <p className="text-xs text-green-600">
              Sent on {new Date(campaign.followup_report_sent_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Completion Status */}
        {isFinalReportSent && isFollowupSent && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Reporting Cycle Complete</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
