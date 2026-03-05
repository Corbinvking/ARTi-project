"use client"

import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";
import { ReceiptLinksManager } from "./ReceiptLinksManager";
import { ScheduleSuggestionPanel } from "./ScheduleSuggestionPanel";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Play, Heart, Repeat2,
  MessageCircle, ExternalLink, Users, Music, Calendar, DollarSign,
} from "lucide-react";
import { formatFollowerCount } from "../../utils/creditCalculations";
import { useAuth } from "@/hooks/use-auth";
import { OverrideField } from "@/components/overrides/OverrideField";
import { saveOverride, revertOverride } from "@/lib/overrides";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
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

export function CampaignDetailModal({ campaign, isOpen, onClose, onCampaignUpdate }: CampaignDetailModalProps) {
  const [totalReceiptsReach, setTotalReceiptsReach] = useState(0);
  const [internalNotes, setInternalNotes] = useState(campaign?.internal_notes || campaign?.notes || '');
  const [clientNotes, setClientNotes] = useState(campaign?.client_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [suggestedInternalNotes, setSuggestedInternalNotes] = useState(campaign?.internal_notes || campaign?.notes || '');
  const [suggestedClientNotes, setSuggestedClientNotes] = useState(campaign?.client_notes || '');
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
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

  useEffect(() => {
    if (isOpen && campaign) {
      fetchDailyStats();
    }
  }, [isOpen, campaign?.id]);

  if (!campaign) return null;

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

  // ── Stats helpers ─────────────────────────────────────────────────
  const refreshTrackStats = async () => {
    if (!campaign?.id) return;
    setRefreshingStats(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/soundcloud/scrape/${campaign.id}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || 'Scrape failed');
      toast({ title: "Stats Refreshed", description: `Updated stats for "${campaign.track_name}"` });
      onCampaignUpdate();
      fetchDailyStats();
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

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const hasTrackStats = (campaign.playback_count ?? 0) > 0 || (campaign.likes_count ?? 0) > 0;

  const latestStats = dailyStats[dailyStats.length - 1];
  const previousStats = dailyStats.length >= 2 ? dailyStats[dailyStats.length - 2] : null;

  const chartData = dailyStats.map((stat, index) => ({
    date: format(new Date(stat.date), 'MMM dd'),
    plays: stat.playback_count,
    likes: stat.likes_count,
    reposts: stat.reposts_count,
    comments: stat.comment_count,
    playsGrowth: index > 0 ? stat.playback_count - dailyStats[index - 1].playback_count : 0,
    likesGrowth: index > 0 ? stat.likes_count - dailyStats[index - 1].likes_count : 0,
  }));

  const statCards = [
    {
      label: 'Total Plays',
      value: campaign.playback_count ?? 0,
      icon: Play,
      color: 'text-green-500',
      trendValue: previousStats && latestStats
        ? calculateTrend(latestStats.playback_count, previousStats.playback_count)
        : null,
    },
    {
      label: 'Total Likes',
      value: campaign.likes_count ?? 0,
      icon: Heart,
      color: 'text-red-500',
      trendValue: previousStats && latestStats
        ? calculateTrend(latestStats.likes_count, previousStats.likes_count)
        : null,
    },
    {
      label: 'Total Reposts',
      value: campaign.reposts_count ?? 0,
      icon: Repeat2,
      color: 'text-orange-500',
      trendValue: previousStats && latestStats
        ? calculateTrend(latestStats.reposts_count, previousStats.reposts_count)
        : null,
    },
    {
      label: 'Total Comments',
      value: campaign.comment_count ?? 0,
      icon: MessageCircle,
      color: 'text-purple-500',
      trendValue: previousStats && latestStats
        ? calculateTrend(latestStats.comment_count, previousStats.comment_count)
        : null,
    },
  ];

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
                  <div className="mt-4 pt-4 border-t flex items-center gap-6 text-sm text-muted-foreground">
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
          </TabsContent>

          {/* ═══════════════ PERFORMANCE TAB ═══════════════ */}
          <TabsContent value="performance" className="space-y-6 mt-4">
            {/* Stat cards row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tabular-nums">{formatNumber(stat.value)}</div>
                      {stat.trendValue !== null && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          {getTrendIcon(stat.trendValue)}
                          <span className="ml-1">
                            {stat.trendValue > 0 ? '+' : ''}{stat.trendValue.toFixed(1)}% from prev day
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Chart */}
            {loadingStats ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading historical data...
                </CardContent>
              </Card>
            ) : dailyStats.length > 1 ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Cumulative Performance
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      {campaign.last_scraped_at && (
                        <span className="text-xs text-muted-foreground">
                          Last updated: {new Date(campaign.last_scraped_at).toLocaleDateString()}{' '}
                          {new Date(campaign.last_scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip
                          formatter={(value: number) => [value.toLocaleString(), '']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="plays"
                          stroke="#22c55e"
                          strokeWidth={2}
                          name="Plays"
                          dot={{ r: 3, fill: "#22c55e" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="likes"
                          stroke="#ef4444"
                          strokeWidth={2}
                          name="Likes"
                          dot={{ r: 3, fill: "#ef4444" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="reposts"
                          stroke="#f97316"
                          strokeWidth={2}
                          name="Reposts"
                          dot={{ r: 3, fill: "#f97316" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="comments"
                          stroke="#a855f7"
                          strokeWidth={2}
                          name="Comments"
                          dot={{ r: 3, fill: "#a855f7" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground space-y-2">
                    {hasTrackStats ? (
                      <>
                        <p>Only one data point so far — charts will appear after the next scrape cycle.</p>
                        <p className="text-sm">Stats are collected twice daily (8 AM & 8 PM UTC).</p>
                      </>
                    ) : (
                      <>
                        <p>No track stats available yet.</p>
                        <p className="text-sm">Click "Refresh Stats" to fetch live data from SoundCloud.</p>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshTrackStats}
                      disabled={refreshingStats}
                      className="gap-1.5 mt-4"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
                      {refreshingStats ? 'Refreshing...' : 'Refresh Stats'}
                    </Button>
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
