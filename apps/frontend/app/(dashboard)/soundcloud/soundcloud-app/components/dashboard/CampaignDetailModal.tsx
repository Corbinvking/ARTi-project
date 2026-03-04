"use client"

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";
import { ReceiptLinksManager } from "./ReceiptLinksManager";
import { ScheduleSuggestionPanel } from "./ScheduleSuggestionPanel";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Play, Heart, Repeat2, MessageCircle, ExternalLink } from "lucide-react";
import { formatFollowerCount } from "../../utils/creditCalculations";
import { useAuth } from "@/hooks/use-auth";
import { OverrideField } from "@/components/overrides/OverrideField";
import { saveOverride, revertOverride } from "@/lib/overrides";

interface Campaign {
  id: string;
  track_name: string;
  artist_name: string;
  track_url: string;
  campaign_type: string;
  status: string;
  goals: number;
  remaining_metrics: number;
  sales_price: number;
  invoice_status: string;
  source_invoice_id?: string;
  start_date: string;
  submission_date: string;
  notes: string;
  internal_notes?: string;
  client_notes?: string;
  playback_count?: number;
  likes_count?: number;
  reposts_count?: number;
  comment_count?: number;
  genre?: string;
  artwork_url?: string;
  artist_username?: string;
  artist_followers?: number;
  last_scraped_at?: string;
  client: {
    name: string;
    email: string;
  };
}

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onCampaignUpdate: () => void;
}

export function CampaignDetailModal({ campaign, isOpen, onClose, onCampaignUpdate }: CampaignDetailModalProps) {
  const [totalReceiptsReach, setTotalReceiptsReach] = useState(0);
  const [internalNotes, setInternalNotes] = useState(campaign?.internal_notes || campaign?.notes || '');
  const [clientNotes, setClientNotes] = useState(campaign?.client_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [suggestedInternalNotes, setSuggestedInternalNotes] = useState(campaign?.internal_notes || campaign?.notes || '');
  const [suggestedClientNotes, setSuggestedClientNotes] = useState(campaign?.client_notes || '');
  const [refreshingStats, setRefreshingStats] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (campaign) {
      setInternalNotes(campaign.internal_notes || campaign.notes || '');
      setClientNotes(campaign.client_notes || '');
      setSuggestedInternalNotes(campaign.internal_notes || campaign.notes || '');
      setSuggestedClientNotes(campaign.client_notes || '');
    }
  }, [campaign?.id]);

  if (!campaign) return null;

  const addNoteHistory = async (noteType: 'internal' | 'client', content: string) => {
    if (!content.trim()) return;
    await (supabase as any).from('campaign_note_history').insert({
      org_id: user?.tenantId || '00000000-0000-0000-0000-000000000001',
      service: 'soundcloud',
      campaign_id: campaign.id,
      note_type: noteType,
      content,
      created_by: user?.id || null,
    });
  };

  const saveNoteOverride = async (
    fieldKey: 'internal_notes' | 'client_notes',
    value: string,
    reason?: string,
  ) => {
    setSavingNotes(true);
    try {
      const updatePayload: Record<string, any> =
        fieldKey === 'internal_notes'
          ? { internal_notes: value.trim() || null, notes: value.trim() || null }
          : { client_notes: value.trim() || null };

      const { error } = await supabase
        .from('soundcloud_campaigns')
        .update({ ...updatePayload, updated_at: new Date().toISOString() })
        .eq('id', campaign.id);

      if (error) throw error;

      if (fieldKey === 'internal_notes') {
        setInternalNotes(value);
        await addNoteHistory('internal', value);
      } else {
        setClientNotes(value);
        await addNoteHistory('client', value);
      }

      await saveOverride({
        service: 'soundcloud',
        campaignId: campaign.id,
        fieldKey,
        originalValue: fieldKey === 'internal_notes' ? suggestedInternalNotes : suggestedClientNotes,
        overrideValue: value,
        overrideReason: reason,
        orgId: user?.tenantId || '00000000-0000-0000-0000-000000000001',
        overriddenBy: user?.id || null,
      });

      toast({ title: "Override saved", description: "Override stored successfully." });
      onCampaignUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to save override.",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const revertNoteOverride = async (fieldKey: 'internal_notes' | 'client_notes') => {
    const suggested = fieldKey === 'internal_notes' ? suggestedInternalNotes : suggestedClientNotes;
    setSavingNotes(true);
    try {
      const updatePayload: Record<string, any> =
        fieldKey === 'internal_notes'
          ? { internal_notes: suggested || null, notes: suggested || null }
          : { client_notes: suggested || null };

      const { error } = await supabase
        .from('soundcloud_campaigns')
        .update({ ...updatePayload, updated_at: new Date().toISOString() })
        .eq('id', campaign.id);

      if (error) throw error;

      await revertOverride({
        service: 'soundcloud',
        campaignId: campaign.id,
        fieldKey,
      });

      if (fieldKey === 'internal_notes') {
        setInternalNotes(suggested);
      } else {
        setClientNotes(suggested);
      }

      toast({ title: "Override reverted", description: "Reverted to suggested value." });
      onCampaignUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to revert override.",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const refreshTrackStats = async () => {
    if (!campaign?.id) return;
    setRefreshingStats(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/soundcloud/scrape/${campaign.id}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Scrape failed');
      }
      toast({ title: "Stats Refreshed", description: `Updated stats for "${campaign.track_name}"` });
      onCampaignUpdate();
    } catch (err: any) {
      toast({ title: "Refresh Failed", description: err.message, variant: "destructive" });
    } finally {
      setRefreshingStats(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500 text-white';
      case 'Complete': return 'bg-blue-500 text-white';
      case 'Pending': return 'bg-yellow-500 text-white';
      case 'Cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const calculateProgress = (goals: number | undefined | null, totalReach: number | undefined | null) => {
    if (!goals || goals === 0) return 0;
    if (!totalReach || totalReach === 0) return 0;
    return Math.max(0, Math.min(100, (totalReach / goals) * 100));
  };

  const handleReachUpdate = (newTotalReach: number) => {
    setTotalReceiptsReach(newTotalReach);
  };

  const handleReachChanged = async (newTotalReach: number) => {
    if (!campaign || !campaign.goals || campaign.goals <= 0) return;

    const newRemaining = Math.max(0, campaign.goals - newTotalReach);
    const remainingStr = String(newRemaining);

    try {
      await supabase
        .from('soundcloud_campaigns')
        .update({
          remaining: remainingStr,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);
    } catch (err) {
      console.error('Failed to auto-update remaining:', err);
    }
  };

  const hasTrackStats = (campaign.playback_count ?? 0) > 0 || (campaign.likes_count ?? 0) > 0;

  const trackStatCards = [
    { label: 'Plays', value: campaign.playback_count ?? 0, icon: Play, color: 'text-green-500' },
    { label: 'Likes', value: campaign.likes_count ?? 0, icon: Heart, color: 'text-blue-500' },
    { label: 'Reposts', value: campaign.reposts_count ?? 0, icon: Repeat2, color: 'text-orange-500' },
    { label: 'Comments', value: campaign.comment_count ?? 0, icon: MessageCircle, color: 'text-purple-500' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Campaign Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Campaign Overview */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{campaign.track_name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    by {campaign.artist_name}
                    {campaign.track_url && (
                      <a
                        href={campaign.track_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit Track
                      </a>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                  {campaign.invoice_status && (
                    <Badge variant="outline">Invoice: {campaign.invoice_status}</Badge>
                  )}
                  {campaign.source_invoice_id && (
                    <Badge variant="secondary">Invoice ID: {campaign.source_invoice_id}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Type</p>
                  <p className="font-medium">{campaign.campaign_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{Math.round(calculateProgress(campaign.goals, totalReceiptsReach))}% Complete</span>
                    </div>
                    <Progress 
                      value={calculateProgress(campaign.goals, totalReceiptsReach)} 
                      className="w-full h-2" 
                    />
                    <div className="text-xs text-muted-foreground">
                      {formatFollowerCount(totalReceiptsReach)} / {formatFollowerCount(campaign.goals)} reach
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="font-medium">${campaign.sales_price}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{campaign.client.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ReceiptLinksManager 
            campaignId={campaign.id}
            onReachUpdate={handleReachUpdate}
            onReachChanged={handleReachChanged}
          />

          {/* Influence Planner Scheduling - only show for paid campaigns that aren't yet complete */}
          {campaign.campaign_type !== 'Free' && campaign.status !== 'Complete' && (
            <ScheduleSuggestionPanel
              submissionId={campaign.id}
              trackUrl={campaign.track_url || ''}
              campaignType="paid"
              currentDate={campaign.start_date}
              goalReposts={campaign.goals}
              onScheduleCreated={(urls) => {
                toast({
                  title: "Schedule Created",
                  description: `${urls.length} schedule(s) created via Influence Planner`,
                });
              }}
              onUpdate={onCampaignUpdate}
              isVisible={isOpen}
            />
          )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
            <CardDescription>Internal notes are ops-only. Client notes are visible to clients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <OverrideField
              label="Internal Notes (Ops Only)"
              value={internalNotes}
              suggestedValue={suggestedInternalNotes}
              overridden={internalNotes.trim() !== suggestedInternalNotes.trim()}
              inputType="textarea"
              rows={3}
              placeholder="Add internal notes..."
              onOverride={(value, reason) => saveNoteOverride('internal_notes', value, reason)}
              onRevert={() => revertNoteOverride('internal_notes')}
            />
            <OverrideField
              label="Client Notes (Visible to Clients)"
              value={clientNotes}
              suggestedValue={suggestedClientNotes}
              overridden={clientNotes.trim() !== suggestedClientNotes.trim()}
              inputType="textarea"
              rows={3}
              placeholder="Add client notes..."
              onOverride={(value, reason) => saveNoteOverride('client_notes', value, reason)}
              onRevert={() => revertNoteOverride('client_notes')}
            />
          </CardContent>
        </Card>

          {/* SoundCloud Track Stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  SoundCloud Track Stats
                </CardTitle>
                <div className="flex items-center gap-3">
                  {campaign.last_scraped_at && (
                    <span className="text-xs text-muted-foreground">
                      Last updated: {new Date(campaign.last_scraped_at).toLocaleDateString()} {new Date(campaign.last_scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshTrackStats}
                    disabled={refreshingStats}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
                    {refreshingStats ? 'Refreshing...' : 'Refresh Stats'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasTrackStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {trackStatCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                          <span className="text-sm text-muted-foreground">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums">
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No track stats available yet.</p>
                  <p className="text-sm mt-1">Click "Refresh Stats" to fetch live data from SoundCloud.</p>
                </div>
              )}
              {campaign.genre && (
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  {campaign.genre && <span>Genre: <strong>{campaign.genre}</strong></span>}
                  {campaign.artist_username && <span>Artist: <strong>{campaign.artist_username}</strong></span>}
                  {campaign.artist_followers != null && campaign.artist_followers > 0 && (
                    <span>Artist Followers: <strong>{campaign.artist_followers.toLocaleString()}</strong></span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}