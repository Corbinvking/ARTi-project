"use client"

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";
import { ReceiptLinksManager } from "./ReceiptLinksManager";
import { ScheduleSuggestionPanel } from "./ScheduleSuggestionPanel";
import { TrendingUp } from "lucide-react";
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

  // Mock streaming data for visualization
  const mockStreamingData = [
    { week: 'W1', plays: 1250, likes: 85, reposts: 12, comments: 8 },
    { week: 'W2', plays: 1890, likes: 134, reposts: 23, comments: 15 },
    { week: 'W3', plays: 2340, likes: 178, reposts: 31, comments: 22 },
    { week: 'W4', plays: 2850, likes: 215, reposts: 38, comments: 28 },
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
                  <CardDescription>by {campaign.artist_name}</CardDescription>
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

          {/* Streaming Metrics Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Week-over-Week Streaming Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockStreamingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="plays" 
                    stroke="#22c55e"
                    strokeWidth={2} 
                    name="Plays"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="likes" 
                    stroke="#3b82f6"
                    strokeWidth={2} 
                    name="Likes"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="reposts" 
                    stroke="#f97316"
                    strokeWidth={2} 
                    name="Reposts"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">2,850</p>
                  <p className="text-sm text-muted-foreground">Total Plays</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">+22% vs last week</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">215</p>
                  <p className="text-sm text-muted-foreground">Total Likes</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">+21% vs last week</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-500">38</p>
                  <p className="text-sm text-muted-foreground">Total Reposts</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">+23% vs last week</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}