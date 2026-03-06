"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";
import { ReceiptLinksManager } from "./ReceiptLinksManager";
import { ScheduleSuggestionPanel } from "./ScheduleSuggestionPanel";
import {
  TrendingUp, TrendingDown, Minus, Play, Heart, Repeat2,
  MessageCircle, ExternalLink, Users, Music, Calendar, Activity,
  Clock, Link, RotateCcw, CheckCircle2, Zap,
} from "lucide-react";
import { formatFollowerCount } from "../../utils/creditCalculations";
import { useAuth } from "@/hooks/use-auth";
import { OverrideField } from "@/components/overrides/OverrideField";
import { saveOverride, revertOverride } from "@/lib/overrides";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
  ip_schedule_urls?: string[];
  ip_schedule_id?: string;
  ip_scheduled_at?: string;
  ip_schedule_start_at?: string;
  ip_schedule_end_at?: string;
  ip_channels_count?: number;
  ip_unrepost_after_hours?: number;
  ip_spread_minutes?: number;
  client: {
    name: string;
    email: string;
  };
}

interface DailyStats {
  date: string;
  playback_count: number;
  likes_count: number;
  reposts_count: number;
  comment_count: number;
  artist_followers: number | null;
  collected_at: string;
}

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onCampaignUpdate: () => void;
}

function formatAxisValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

export function CampaignDetailModal({ campaign, isOpen, onClose, onCampaignUpdate }: CampaignDetailModalProps) {
  const [totalReceiptsReach, setTotalReceiptsReach] = useState(0);
  const [internalNotes, setInternalNotes] = useState(campaign?.internal_notes || campaign?.notes || '');
  const [clientNotes, setClientNotes] = useState(campaign?.client_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [suggestedInternalNotes, setSuggestedInternalNotes] = useState(campaign?.internal_notes || campaign?.notes || '');
  const [suggestedClientNotes, setSuggestedClientNotes] = useState(campaign?.client_notes || '');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const lastAutoRefreshId = useRef<string | null>(null);
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

  const fetchDailyStats = useCallback(async () => {
    if (!campaign) return;
    setLoadingStats(true);
    try {
      const { data, error } = await (supabase as any)
        .from('sc_campaign_stats_daily')
        .select('date, playback_count, likes_count, reposts_count, comment_count, artist_followers, collected_at')
        .eq('campaign_id', Number(campaign.id))
        .order('date', { ascending: true });

      if (error) throw error;
      setDailyStats(data || []);
    } catch (err) {
      console.error('Error fetching SC daily stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [campaign?.id]);

  // Auto-refresh: scrape fresh data when the modal opens, then reload stats + campaign
  useEffect(() => {
    if (!isOpen || !campaign?.id) return;
    if (lastAutoRefreshId.current === campaign.id) return;
    lastAutoRefreshId.current = campaign.id;

    const autoRefresh = async () => {
      setAutoRefreshing(true);
      try {
        const res = await fetch(`/api/soundcloud/scrape/${campaign.id}`);
        const json = await res.json();
        if (res.ok && json.ok) {
          onCampaignUpdate();
        }
      } catch {
        // silent — auto-refresh is best-effort
      } finally {
        setAutoRefreshing(false);
        fetchDailyStats();
      }
    };

    fetchDailyStats();
    autoRefresh();
  }, [isOpen, campaign?.id]);

  // Reset the auto-refresh gate when modal closes so next open re-triggers
  useEffect(() => {
    if (!isOpen) {
      lastAutoRefreshId.current = null;
    }
  }, [isOpen]);

  // ── Performance chart data (must be before early return to keep hook order stable) ──
  const chartData = useMemo(() => {
    if (dailyStats.length < 2) return null;

    const data = dailyStats.map((stat) => ({
      date: format(new Date(stat.date), 'MMM dd'),
      plays: stat.playback_count,
      likes: stat.likes_count,
      reposts: stat.reposts_count,
      comments: stat.comment_count,
    }));

    const first = dailyStats[0];
    const last = dailyStats[dailyStats.length - 1];

    const metrics: {
      key: 'plays' | 'likes' | 'reposts' | 'comments';
      label: string;
      color: string;
      icon: JSX.Element;
      current: number;
      change: number;
    }[] = [
      {
        key: 'plays',
        label: 'Plays',
        color: '#22c55e',
        icon: <Play className="h-3.5 w-3.5" />,
        current: last.playback_count,
        change: last.playback_count - first.playback_count,
      },
      {
        key: 'likes',
        label: 'Likes',
        color: '#ef4444',
        icon: <Heart className="h-3.5 w-3.5" />,
        current: last.likes_count,
        change: last.likes_count - first.likes_count,
      },
      {
        key: 'reposts',
        label: 'Reposts',
        color: '#f97316',
        icon: <Repeat2 className="h-3.5 w-3.5" />,
        current: last.reposts_count,
        change: last.reposts_count - first.reposts_count,
      },
      {
        key: 'comments',
        label: 'Comments',
        color: '#a855f7',
        icon: <MessageCircle className="h-3.5 w-3.5" />,
        current: last.comment_count,
        change: last.comment_count - first.comment_count,
      },
    ];

    return { data, metrics };
  }, [dailyStats]);

  const hasTrackStats = (campaign?.playback_count ?? 0) > 0 || (campaign?.likes_count ?? 0) > 0;

  const [showReschedule, setShowReschedule] = useState(false);

  // Reset reschedule toggle when campaign changes
  useEffect(() => {
    setShowReschedule(false);
  }, [campaign?.id]);

  if (!campaign) return null;

  const hasSchedule = (campaign.ip_schedule_urls?.length ?? 0) > 0;

  const getSchedulePhase = () => {
    if (!campaign.ip_schedule_start_at || !campaign.ip_schedule_end_at) return null;
    const now = Date.now();
    const start = new Date(campaign.ip_schedule_start_at).getTime();
    const end = new Date(campaign.ip_schedule_end_at).getTime();
    const spreadMs = (campaign.ip_spread_minutes ?? 60) * 60_000;
    const channelCount = campaign.ip_channels_count ?? 1;
    const lastRepost = start + (channelCount - 1) * spreadMs;

    if (now < start) return { label: 'Scheduled', color: 'bg-blue-500', progress: 0 };
    if (now < lastRepost) {
      const p = ((now - start) / (lastRepost - start)) * 100;
      return { label: 'Reposts Active', color: 'bg-green-500', progress: Math.round(p) };
    }
    if (now < end) {
      const p = ((now - lastRepost) / (end - lastRepost)) * 100;
      return { label: 'Unrepost Window', color: 'bg-amber-500', progress: Math.round(p) };
    }
    return { label: 'Complete', color: 'bg-blue-600', progress: 100 };
  };

  const schedulePhase = hasSchedule ? getSchedulePhase() : null;

  // ── Note helpers ──────────────────────────────────────────────────
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
      toast({ title: "Error", description: error?.message || "Failed to save override.", variant: "destructive" });
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

      await revertOverride({ service: 'soundcloud', campaignId: campaign.id, fieldKey });

      if (fieldKey === 'internal_notes') setInternalNotes(suggested);
      else setClientNotes(suggested);

      toast({ title: "Override reverted", description: "Reverted to suggested value." });
      onCampaignUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to revert override.", variant: "destructive" });
    } finally {
      setSavingNotes(false);
    }
  };

  // ── Layout helpers ────────────────────────────────────────────────
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

  const handleReachUpdate = (newTotalReach: number) => setTotalReceiptsReach(newTotalReach);

  const handleReachChanged = async (newTotalReach: number) => {
    if (!campaign || !campaign.goals || campaign.goals <= 0) return;
    const newRemaining = Math.max(0, campaign.goals - newTotalReach);
    try {
      await supabase
        .from('soundcloud_campaigns')
        .update({ remaining: String(newRemaining), updated_at: new Date().toISOString() })
        .eq('id', campaign.id);
    } catch (err) {
      console.error('Failed to auto-update remaining:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{campaign.track_name}</DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
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
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
              {campaign.invoice_status && (
                <Badge variant="outline">Invoice: {campaign.invoice_status}</Badge>
              )}
              {campaign.source_invoice_id && (
                <Badge variant="secondary">Invoice ID: {campaign.source_invoice_id}</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="planner">Influence Planner</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Details</CardTitle>
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

                {(campaign.genre || campaign.artist_username) && (
                  <div className="mt-4 pt-4 border-t flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                    {campaign.genre && (
                      <span className="flex items-center gap-1">
                        <Music className="h-3.5 w-3.5" /> {campaign.genre}
                      </span>
                    )}
                    {campaign.artist_username && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {campaign.artist_username}
                      </span>
                    )}
                    {campaign.artist_followers != null && campaign.artist_followers > 0 && (
                      <span>{campaign.artist_followers.toLocaleString()} followers</span>
                    )}
                    {campaign.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Started {new Date(campaign.start_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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
          </TabsContent>

          {/* ═══════════════ INFLUENCE PLANNER TAB ═══════════════ */}
          <TabsContent value="planner" className="space-y-6 mt-4">
            <ReceiptLinksManager
              campaignId={campaign.id}
              onReachUpdate={handleReachUpdate}
              onReachChanged={handleReachChanged}
            />

            {/* Schedule Status Card -- shown when a schedule already exists */}
            {hasSchedule && !showReschedule && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Schedule Status
                    </CardTitle>
                    {schedulePhase && (
                      <Badge className={`${schedulePhase.color} text-white`}>
                        {schedulePhase.label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Timeline progress bar */}
                  {schedulePhase && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{schedulePhase.label}</span>
                        <span>{schedulePhase.progress}%</span>
                      </div>
                      <Progress value={schedulePhase.progress} className="h-2" />
                    </div>
                  )}

                  {/* Schedule details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {campaign.ip_schedule_start_at && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Repost Start
                        </p>
                        <p className="font-medium">
                          {format(new Date(campaign.ip_schedule_start_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                    {campaign.ip_schedule_end_at && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Unrepost End
                        </p>
                        <p className="font-medium">
                          {format(new Date(campaign.ip_schedule_end_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                    {campaign.ip_channels_count != null && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Channels
                        </p>
                        <p className="font-medium">{campaign.ip_channels_count}</p>
                      </div>
                    )}
                    {campaign.ip_scheduled_at && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Booked On
                        </p>
                        <p className="font-medium">
                          {format(new Date(campaign.ip_scheduled_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Schedule links */}
                  {campaign.ip_schedule_urls && campaign.ip_schedule_urls.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Link className="h-3.5 w-3.5" /> Schedule Links
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.ip_schedule_urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Schedule {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reschedule action */}
                  {campaign.status !== 'Complete' && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReschedule(true)}
                        className="w-full"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reschedule Campaign
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Schedule creation panel -- shown when no schedule exists, or user clicked Reschedule */}
            {campaign.campaign_type !== 'Free' && (!hasSchedule || showReschedule) && (
              <ScheduleSuggestionPanel
                submissionId={campaign.id}
                trackUrl={campaign.track_url || ''}
                campaignType="paid"
                currentDate={campaign.start_date}
                goalReposts={campaign.goals}
                onScheduleCreated={(urls) => {
                  setShowReschedule(false);
                  toast({
                    title: "Schedule Created",
                    description: `${urls.length} schedule(s) created via Influence Planner`,
                  });
                }}
                onUpdate={onCampaignUpdate}
                isVisible={isOpen}
              />
            )}
          </TabsContent>

          {/* ═══════════════ PERFORMANCE TAB ═══════════════ */}
          <TabsContent value="performance" className="space-y-6 mt-4">
            {autoRefreshing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 animate-pulse" />
                Fetching latest stats from SoundCloud...
              </div>
            )}

            {loadingStats ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading historical data...
                </CardContent>
              </Card>
            ) : chartData ? (
              <>
                {/* Last updated timestamp */}
                {campaign.last_scraped_at && (
                  <div className="text-xs text-muted-foreground text-right">
                    Last updated: {new Date(campaign.last_scraped_at).toLocaleDateString()}{' '}
                    {new Date(campaign.last_scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {/* 2x2 metric cards with individual AreaCharts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Performance Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const scheduleStartLabel = campaign.ip_schedule_start_at
                        ? format(new Date(campaign.ip_schedule_start_at), 'MMM dd')
                        : null;
                      const scheduleEndLabel = campaign.ip_schedule_end_at
                        ? format(new Date(campaign.ip_schedule_end_at), 'MMM dd')
                        : null;

                      return (
                        <div className="grid grid-cols-2 gap-4">
                          {chartData.metrics.map((metric, idx) => (
                            <div key={metric.key} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: metric.color }}>
                                  {metric.icon}
                                  {metric.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold tabular-nums">
                                    {formatAxisValue(metric.current)}
                                  </span>
                                  {metric.change !== 0 && (
                                    <span className={`text-xs flex items-center gap-0.5 ${metric.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {metric.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                      {metric.change > 0 ? '+' : ''}{formatAxisValue(metric.change)}
                                    </span>
                                  )}
                                  {metric.change === 0 && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                      <Minus className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-36">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={chartData.data} margin={{ top: 4, right: 4, left: 0, bottom: idx >= 2 ? 40 : 4 }}>
                                    <defs>
                                      <linearGradient id={`sc-gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                                    <XAxis
                                      dataKey="date"
                                      tick={idx >= 2 ? { fontSize: 9 } : false}
                                      axisLine={false}
                                      tickLine={false}
                                      angle={-45}
                                      textAnchor="end"
                                      height={idx >= 2 ? 40 : 4}
                                      interval="preserveStartEnd"
                                    />
                                    <YAxis
                                      domain={['auto', 'auto']}
                                      tick={{ fontSize: 9 }}
                                      tickFormatter={formatAxisValue}
                                      axisLine={false}
                                      tickLine={false}
                                      width={45}
                                    />
                                    <RechartsTooltip
                                      formatter={(value: number) => [value.toLocaleString(), metric.label]}
                                      labelFormatter={(label) => `${label}`}
                                      contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        fontSize: 12,
                                      }}
                                      labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                                    />
                                    {scheduleStartLabel && (
                                      <ReferenceLine
                                        x={scheduleStartLabel}
                                        stroke="#22c55e"
                                        strokeDasharray="4 4"
                                        strokeWidth={1.5}
                                        label={{ value: 'Reposts Start', position: 'top', fill: '#22c55e', fontSize: 8 }}
                                      />
                                    )}
                                    {scheduleEndLabel && (
                                      <ReferenceLine
                                        x={scheduleEndLabel}
                                        stroke="#ef4444"
                                        strokeDasharray="4 4"
                                        strokeWidth={1.5}
                                        label={{ value: 'Unrepost End', position: 'top', fill: '#ef4444', fontSize: 8 }}
                                      />
                                    )}
                                    <Area
                                      type="monotone"
                                      dataKey={metric.key}
                                      stroke={metric.color}
                                      strokeWidth={2}
                                      fill={`url(#sc-gradient-${metric.key})`}
                                      connectNulls={true}
                                      dot={{ r: 2, fill: metric.color }}
                                      activeDot={{ r: 4, fill: metric.color }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground space-y-2">
                    {hasTrackStats ? (
                      <>
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">Collecting performance data...</p>
                        <p className="text-sm">
                          Only one data point so far. Charts will appear after the next scrape cycle
                          (8 AM & 8 PM UTC daily).
                        </p>
                      </>
                    ) : autoRefreshing ? (
                      <>
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-40 animate-pulse" />
                        <p className="font-medium">Fetching stats from SoundCloud...</p>
                        <p className="text-sm">This may take a moment.</p>
                      </>
                    ) : (
                      <>
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p>No track stats available yet.</p>
                        <p className="text-sm">Stats will be fetched automatically when this campaign has a valid SoundCloud URL.</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
