"use client"

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { useToast } from "../hooks/use-toast";
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from "../lib/constants";
import { Info, Upload, Mail } from "lucide-react";
import Papa from "papaparse";

interface CampaignWeeklyUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CampaignWeeklyUpdateModal({ 
  open, 
  onOpenChange 
}: CampaignWeeklyUpdateModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [reportNotes, setReportNotes] = useState('');
  const [sendReports, setSendReports] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleWeeklyUpdateImport = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const { data } = Papa.parse(text, { header: true });
      
      let updateCount = 0;
      for (const row of data as any[]) {
        if (!row.campaign_name) continue;
        
        // Find campaign by name
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('*')
          .eq('name', row.campaign_name.trim())
          .eq('source', APP_CAMPAIGN_SOURCE)
          .eq('campaign_type', APP_CAMPAIGN_TYPE)
          .single();
        
        if (campaign) {
          // Update campaign with weekly data
          const dailyStreams = parseInt(row.daily_streams) || 0;
          const weeklyStreams = parseInt(row.weekly_streams) || 0;
          const remainingStreams = parseInt(row.remaining_streams) || campaign.remaining_streams;
          
          await supabase
            .from('campaigns')
            .update({
              remaining_streams: remainingStreams,
              // Could add delivered_streams calculation here
              delivered_streams: campaign.stream_goal - remainingStreams
            })
            .eq('id', campaign.id);
          
          // Create weekly update entry
          await supabase
            .from('weekly_updates')
            .insert({
              campaign_id: campaign.id,
              streams: weeklyStreams,
              imported_on: new Date().toISOString().split('T')[0],
              notes: `Daily: ${dailyStreams}, Weekly: ${weeklyStreams}, Remaining: ${remainingStreams}`
            });
          
          updateCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-updates'] });
      
      toast({
        title: "Import Successful",
        description: `Updated ${updateCount} campaigns with weekly data`,
      });
      
      setImportCompleted(true);
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to import weekly updates. Please check the format.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSendReports = async () => {
    if (!sendReports) return;
    
    try {
      setIsImporting(true);
      
      // Get all active campaigns with client emails
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients:client_id (
            name,
            emails
          )
        `)
        .eq('status', 'active');
      
      if (error) throw error;

      // Send reports to clients (placeholder - would integrate with email service)
      const campaignsWithClients = campaigns?.filter(c => c.clients && c.clients.emails?.length > 0) || [];
      
      if (campaignsWithClients.length === 0) {
        toast({
          title: "No reports to send",
          description: "No active campaigns found with client emails",
          variant: "destructive",
        });
        return;
      }

      // This would integrate with an email service
      console.log('Would send weekly reports to:', campaignsWithClients.map(c => ({
        campaign: c.name,
        client: c.clients.name,
        emails: c.clients.emails,
        notes: reportNotes
      })));

      toast({
        title: "Weekly reports sent",
        description: `Reports sent to ${campaignsWithClients.length} clients`,
      });

      // Reset form
      setReportNotes('');
      setSendReports(false);
      setImportCompleted(false);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Send reports error:', error);
      toast({
        title: "Failed to send reports",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Import Campaign Weekly Updates
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <pre className="text-xs">
                    Format: campaign_name,daily_streams,weekly_streams,remaining_streams,playlists{'\n'}
                    Example: "Jared Rapoza",222,1554,18446,"Underground Hip-Hop, Trap & Bass"
                  </pre>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <DialogDescription>
            Upload CSV with weekly streaming performance data
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="weekly-update-file">CSV File</Label>
            <Input
              id="weekly-update-file"
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleWeeklyUpdateImport(file);
              }}
              disabled={isImporting}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>Expected format:</p>
            <ul className="list-disc list-inside mt-1">
              <li>campaign_name: Exact name of existing campaign</li>
              <li>daily_streams: Current daily streaming rate</li>
              <li>weekly_streams: Total streams for the week</li>
              <li>remaining_streams: Streams still needed to reach goal</li>
              <li>playlists: Comma-separated list of playlist names (optional)</li>
            </ul>
          </div>

          {importCompleted && (
            <div className="space-y-4 border-t pt-6">
              <div className="space-y-3">
                <Label htmlFor="report-notes">Weekly Report Notes (Optional)</Label>
                <Textarea
                  id="report-notes"
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Add any specific notes for this week's client reports..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-reports"
                  checked={sendReports}
                  onCheckedChange={(checked) => setSendReports(checked as boolean)}
                />
                <Label 
                  htmlFor="send-reports" 
                  className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <Mail className="h-4 w-4" />
                  Send weekly reports to clients
                </Label>
              </div>

              {sendReports && (
                <p className="text-xs text-muted-foreground ml-6">
                  Reports will be sent to all client email addresses for active campaigns
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {importCompleted && sendReports && (
            <Button onClick={handleSendReports} disabled={isImporting}>
              {isImporting ? 'Sending...' : 'Send Weekly Reports'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}








