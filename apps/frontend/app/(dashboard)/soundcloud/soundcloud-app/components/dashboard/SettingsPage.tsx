"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "../../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "../../hooks/use-toast";
import { Loader2, Save, Settings2, Clock, Users, Bell, Plus, Trash2 } from "lucide-react";

const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  min: z.number().min(0, "Minimum must be non-negative"),
  max: z.number().min(0, "Maximum must be non-negative"),
});

const settingsSchema = z.object({
  slack_enabled: z.boolean(),
  slack_channel: z.string().optional(),
  slack_webhook: z.string().url().optional().or(z.literal("")),
  preview_cache_days: z.number().min(1).max(365),
  inactivity_days: z.number().min(1).max(365),
  proof_sla_hours: z.number().min(1).max(168),
  decision_sla_hours: z.number().min(1).max(168),
  size_tiers: z.array(tierSchema).min(1, "At least one tier is required"),
  ip_base_url: z.string().url().optional().or(z.literal("")),
  ip_username: z.string().optional().or(z.literal("")),
  ip_api_key: z.string().optional(),
}).refine((data) => {
  // Validate that tiers don't overlap and are in logical order
  const sortedTiers = [...data.size_tiers].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sortedTiers.length; i++) {
    const tier = sortedTiers[i];
    if (tier.min >= tier.max) return false;
    if (i > 0 && tier.min < sortedTiers[i - 1].max) return false;
  }
  return true;
}, {
  message: "Tiers must not overlap and minimum must be less than maximum",
  path: ["size_tiers"],
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [ipKeyConfigured, setIpKeyConfigured] = useState(false);
  const [ipKeyLocked, setIpKeyLocked] = useState(true);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [revealingKey, setRevealingKey] = useState(false);
  const [lastTestStatus, setLastTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [lastTestMessage, setLastTestMessage] = useState<string | null>(null);
  const [lastTestAt, setLastTestAt] = useState<string | null>(null);
  const [membersCheckLoading, setMembersCheckLoading] = useState(false);
  const [scheduleCheckLoading, setScheduleCheckLoading] = useState(false);
  const [memberLogs, setMemberLogs] = useState<Array<Record<string, any>>>([]);
  const [scheduleLogs, setScheduleLogs] = useState<Array<Record<string, any>>>([]);
  const [membersParams, setMembersParams] = useState({
    limit: "1",
    offset: "0",
    searchTerm: "",
    sortBy: "UPDATED",
    sortDir: "DESC",
  });
  const [schedulePayload, setSchedulePayload] = useState({
    types: "REPOST",
    medias: "",
    targets: "",
    settings: '{"spreadBetweenAccountsMinutes":60,"spreadBetweenTracksMinutes":60}',
    comment: "",
  });
  const { toast } = useToast();
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      slack_enabled: false,
      slack_channel: "#soundcloud-groups",
      slack_webhook: "",
      preview_cache_days: 30,
      inactivity_days: 90,
      proof_sla_hours: 24,
      decision_sla_hours: 24,
      size_tiers: [
        { name: "Nano", min: 0, max: 1000 },
        { name: "Micro", min: 1000, max: 10000 },
        { name: "Mid", min: 10000, max: 100000 },
        { name: "Macro", min: 100000, max: 999999999 },
      ],
      ip_base_url: "https://api.influenceplanner.com/partner/v1/",
      ip_username: "",
      ip_api_key: "",
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionToken(data.session?.access_token ?? null);
    };

    syncSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionToken(session?.access_token ?? null);
    });

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionToken) {
      fetchInfluencePlannerSettings();
    }
  }, [sessionToken]);

  const fetchInfluencePlannerSettings = async () => {
    if (!sessionToken) return;
    try {
      const response = await fetch("/api/soundcloud/influenceplanner/settings", {
        headers: {
          Authorization: sessionToken ? `Bearer ${sessionToken}` : "",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "Failed to load InfluencePlanner settings.");
      }

      const data = await response.json();
      form.setValue("ip_base_url", data.ip_base_url || "https://api.influenceplanner.com/partner/v1/");
      form.setValue("ip_username", data.ip_username || "");
      setIpKeyConfigured(!!data.api_key_configured);
      if (!data.api_key_configured) {
        setIpKeyLocked(false);
      }
    } catch (error) {
      console.warn("InfluencePlanner settings unavailable:", error);
      toast({
        title: "InfluencePlanner settings",
        description: "Unable to load API key status. Try refreshing.",
        variant: "destructive",
      });
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("soundcloud_settings")
        .select([
          "slack_enabled",
          "slack_channel",
          "slack_webhook",
          "preview_cache_days",
          "inactivity_days",
          "proof_sla_hours",
          "decision_sla_hours",
          "size_tier_thresholds",
        ])
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : null;
      if (row) {
        // Handle both old format (T1-T4 object) and new format (array)
        let sizeTiers;
        if (Array.isArray(row.size_tier_thresholds)) {
          sizeTiers = row.size_tier_thresholds;
        } else if (row.size_tier_thresholds) {
          // Convert old format to new format
          const oldFormat = row.size_tier_thresholds as any;
          sizeTiers = [
            { name: "Nano", min: oldFormat.T1?.min || 0, max: oldFormat.T1?.max || 1000 },
            { name: "Micro", min: oldFormat.T2?.min || 1000, max: oldFormat.T2?.max || 10000 },
            { name: "Mid", min: oldFormat.T3?.min || 10000, max: oldFormat.T3?.max || 100000 },
            { name: "Macro", min: oldFormat.T4?.min || 100000, max: oldFormat.T4?.max || 999999999 },
          ];
        } else {
          sizeTiers = [
            { name: "Nano", min: 0, max: 1000 },
            { name: "Micro", min: 1000, max: 10000 },
            { name: "Mid", min: 10000, max: 100000 },
            { name: "Macro", min: 100000, max: 999999999 },
          ];
        }
        
        form.reset({
          slack_enabled: row.slack_enabled || false,
          slack_channel: row.slack_channel || "#soundcloud-groups",
          slack_webhook: row.slack_webhook || "",
          preview_cache_days: row.preview_cache_days || 30,
          inactivity_days: row.inactivity_days || 90,
          proof_sla_hours: row.proof_sla_hours || 24,
          decision_sla_hours: row.decision_sla_hours || 24,
          size_tiers: sizeTiers,
          ip_base_url: form.getValues("ip_base_url"),
          ip_username: form.getValues("ip_username"),
          ip_api_key: "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    try {
      await saveInfluencePlannerSettings(data);

      const settingsData = {
        slack_enabled: data.slack_enabled,
        slack_channel: data.slack_channel,
        slack_webhook: data.slack_webhook || null,
        preview_cache_days: data.preview_cache_days,
        inactivity_days: data.inactivity_days,
        proof_sla_hours: data.proof_sla_hours,
        decision_sla_hours: data.decision_sla_hours,
        size_tier_thresholds: data.size_tiers,
        updated_at: new Date().toISOString(),
      };

      // Try to update existing settings, if none exist, insert new ones
      const { error: upsertError } = await supabase
        .from("soundcloud_settings")
        .upsert(settingsData, { onConflict: "id" });

      if (upsertError) {
        throw upsertError;
      }

      toast({
        title: "Success",
        description: "Settings updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveInfluencePlannerSettings = async (data: SettingsFormData) => {
    if (!data.ip_username && !data.ip_api_key) {
      return;
    }

    if (!data.ip_username) {
      throw new Error("InfluencePlanner username is required.");
    }

    if (!sessionToken) {
      throw new Error("You must be signed in to save API settings.");
    }

    const payload = {
      ip_base_url: data.ip_base_url || "https://api.influenceplanner.com/partner/v1/",
      ip_username: data.ip_username,
      ip_api_key: data.ip_api_key || undefined,
    };

    const response = await fetch("/api/soundcloud/influenceplanner/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: sessionToken ? `Bearer ${sessionToken}` : "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.error || "Failed to save InfluencePlanner settings.");
    }

    if (data.ip_api_key) {
      setIpKeyConfigured(true);
      setIpKeyLocked(true);
      setRevealedApiKey(null);
      form.setValue("ip_api_key", "");
    }
  };

  const handleRevealApiKey = async () => {
    if (!sessionToken) {
      toast({
        title: "Not authenticated",
        description: "Sign in before revealing the API key.",
        variant: "destructive",
      });
      return;
    }

    setRevealingKey(true);
    try {
      const response = await fetch("/api/soundcloud/influenceplanner/settings?reveal=true", {
        headers: {
          Authorization: sessionToken ? `Bearer ${sessionToken}` : "",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "Failed to reveal API key.");
      }

      const data = await response.json();
      setRevealedApiKey(data.ip_api_key || "");
      setIpKeyLocked(false);
    } catch (error: any) {
      toast({
        title: "Reveal failed",
        description: error.message || "Unable to fetch API key.",
        variant: "destructive",
      });
    } finally {
      setRevealingKey(false);
    }
  };

  const handleLockApiKey = () => {
    setIpKeyLocked(true);
    setRevealedApiKey(null);
    form.setValue("ip_api_key", "");
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch("/api/soundcloud/influenceplanner/test", {
        headers: {
          Authorization: sessionToken ? `Bearer ${sessionToken}` : "",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "InfluencePlanner connection failed.");
      }

      setLastTestStatus("success");
      setLastTestMessage("Connection successful");
      setLastTestAt(new Date().toLocaleString());
      toast({
        title: "Connection successful",
        description: "InfluencePlanner API responded successfully.",
      });
    } catch (error: any) {
      setLastTestStatus("error");
      setLastTestMessage(error.message || "Connection failed");
      setLastTestAt(new Date().toLocaleString());
      toast({
        title: "Connection failed",
        description: error.message || "Unable to reach InfluencePlanner API.",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCheckMembers = async () => {
    if (!sessionToken) {
      toast({
        title: "Not authenticated",
        description: "Sign in before testing endpoints.",
        variant: "destructive",
      });
      return;
    }

    setMembersCheckLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (membersParams.limit) searchParams.set("limit", membersParams.limit);
      if (membersParams.offset) searchParams.set("offset", membersParams.offset);
      if (membersParams.searchTerm) searchParams.set("searchTerm", membersParams.searchTerm);
      if (membersParams.sortBy) searchParams.set("sortBy", membersParams.sortBy);
      if (membersParams.sortDir) searchParams.set("sortDir", membersParams.sortDir);

      const response = await fetch(`/api/soundcloud/influenceplanner/members?${searchParams.toString()}`, {
        headers: {
          Authorization: sessionToken ? `Bearer ${sessionToken}` : "",
        },
      });

      const data = await response.json();
      setMemberLogs((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          status: response.status,
          headers: data?.headers || {},
          body: data?.body ?? data,
        },
        ...prev,
      ].slice(0, 5));
    } catch (error: any) {
      setMemberLogs((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          status: "error",
          headers: {},
          body: { error: error.message || "Members endpoint failed." },
        },
        ...prev,
      ].slice(0, 5));
    } finally {
      setMembersCheckLoading(false);
    }
  };

  const handleCheckSchedule = async () => {
    if (!sessionToken) {
      toast({
        title: "Not authenticated",
        description: "Sign in before testing endpoints.",
        variant: "destructive",
      });
      return;
    }

    setScheduleCheckLoading(true);
    try {
      let settingsValue: any = null;
      try {
        settingsValue = schedulePayload.settings ? JSON.parse(schedulePayload.settings) : null;
      } catch {
        settingsValue = null;
      }

      const payload = {
        types: schedulePayload.types
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        medias: schedulePayload.medias
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        targets: schedulePayload.targets
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        settings: settingsValue,
        comment: schedulePayload.comment ? schedulePayload.comment : null,
      };

      const response = await fetch("/api/soundcloud/influenceplanner/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: sessionToken ? `Bearer ${sessionToken}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setScheduleLogs((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          status: response.status,
          headers: data?.headers || {},
          body: data?.body ?? data,
        },
        ...prev,
      ].slice(0, 5));
    } catch (error: any) {
      setScheduleLogs((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          status: "error",
          headers: {},
          body: { error: error.message || "Schedule endpoint failed." },
        },
        ...prev,
      ].slice(0, 5));
    } finally {
      setScheduleCheckLoading(false);
    }
  };

  const handleCopyLog = async (entry: Record<string, any>) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
      toast({
        title: "Copied",
        description: "Log entry copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy log entry.",
        variant: "destructive",
      });
    }
  };

  const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const addTier = () => {
    const currentTiers = form.getValues("size_tiers");
    const lastTier = currentTiers[currentTiers.length - 1];
    const newTier = {
      name: `Tier ${currentTiers.length + 1}`,
      min: lastTier ? lastTier.max : 0,
      max: lastTier ? lastTier.max * 10 : 1000,
    };
    form.setValue("size_tiers", [...currentTiers, newTier]);
  };

  const removeTier = (index: number) => {
    const currentTiers = form.getValues("size_tiers");
    if (currentTiers.length > 1) {
      form.setValue("size_tiers", currentTiers.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5" />
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <CardTitle>Notification Settings</CardTitle>
              </div>
              <CardDescription>
                Configure Slack integration for system notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="slack_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Slack Notifications</FormLabel>
                      <FormDescription>
                        Send system notifications to Slack channels
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slack_channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slack Channel</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="#soundcloud-groups" />
                      </FormControl>
                      <FormDescription>
                        Default channel for notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slack_webhook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slack Webhook URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://hooks.slack.com/..." type="url" />
                      </FormControl>
                      <FormDescription>
                        Webhook URL for Slack integration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* InfluencePlanner API */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>InfluencePlanner API</CardTitle>
                  <CardDescription>
                    Configure InfluencePlanner connectivity for member syncing and scheduling
                  </CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  {ipKeyConfigured ? "API key configured" : "API key not set"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed p-3 text-sm space-y-4">
                <div className="font-medium">Available endpoints</div>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>GET {form.watch("ip_base_url") || "https://api.influenceplanner.com/partner/v1/"}network/members</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCheckMembers}
                      disabled={!ipKeyConfigured || membersCheckLoading}
                    >
                      {membersCheckLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test members"
                      )}
                    </Button>
                  </div>
                  {membersCheckResult && (
                    <div className="text-xs text-muted-foreground">{membersCheckResult}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span>POST {form.watch("ip_base_url") || "https://api.influenceplanner.com/partner/v1/"}schedule/create</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCheckSchedule}
                      disabled={!ipKeyConfigured || scheduleCheckLoading}
                    >
                      {scheduleCheckLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test schedule"
                      )}
                    </Button>
                  </div>
                  {scheduleCheckResult && (
                    <div className="text-xs text-muted-foreground">{scheduleCheckResult}</div>
                  )}
                </div>
                <div className="mt-3 border-t pt-3">
                  <div className="font-medium">App proxy endpoints</div>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <div>GET {appBaseUrl}/api/soundcloud/influenceplanner/members</div>
                    <div>POST {appBaseUrl}/api/soundcloud/influenceplanner/schedule</div>
                    <div>GET {appBaseUrl}/api/soundcloud/influenceplanner/settings</div>
                    <div>POST {appBaseUrl}/api/soundcloud/influenceplanner/settings</div>
                    <div>GET {appBaseUrl}/api/soundcloud/influenceplanner/test</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed p-3 text-sm space-y-3">
                <div className="font-medium">Members test inputs</div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <FormLabel>Limit</FormLabel>
                    <Input
                      value={membersParams.limit}
                      onChange={(event) => setMembersParams((prev) => ({ ...prev, limit: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <FormLabel>Offset</FormLabel>
                    <Input
                      value={membersParams.offset}
                      onChange={(event) => setMembersParams((prev) => ({ ...prev, offset: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <FormLabel>Search term</FormLabel>
                    <Input
                      value={membersParams.searchTerm}
                      onChange={(event) => setMembersParams((prev) => ({ ...prev, searchTerm: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <FormLabel>Sort</FormLabel>
                    <Select
                      value={`${membersParams.sortBy}:${membersParams.sortDir}`}
                      onValueChange={(value) => {
                        const [sortBy, sortDir] = value.split(":");
                        setMembersParams((prev) => ({ ...prev, sortBy, sortDir }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPDATED:DESC">Updated (desc)</SelectItem>
                        <SelectItem value="UPDATED:ASC">Updated (asc)</SelectItem>
                        <SelectItem value="FOLLOWERS:DESC">Followers (desc)</SelectItem>
                        <SelectItem value="FOLLOWERS:ASC">Followers (asc)</SelectItem>
                        <SelectItem value="CREATED:DESC">Created (desc)</SelectItem>
                        <SelectItem value="CREATED:ASC">Created (asc)</SelectItem>
                        <SelectItem value="STATUS:DESC">Status (desc)</SelectItem>
                        <SelectItem value="STATUS:ASC">Status (asc)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed p-3 text-sm space-y-3">
                <div className="font-medium">Schedule test payload</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <FormLabel>Types (comma separated)</FormLabel>
                    <Input
                      value={schedulePayload.types}
                      onChange={(event) => setSchedulePayload((prev) => ({ ...prev, types: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <FormLabel>Comment (optional)</FormLabel>
                    <Input
                      value={schedulePayload.comment}
                      onChange={(event) => setSchedulePayload((prev) => ({ ...prev, comment: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <FormLabel>Medias (one URL per line)</FormLabel>
                    <Textarea
                      value={schedulePayload.medias}
                      onChange={(event) => setSchedulePayload((prev) => ({ ...prev, medias: event.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <FormLabel>Targets (one user ID per line)</FormLabel>
                    <Textarea
                      value={schedulePayload.targets}
                      onChange={(event) => setSchedulePayload((prev) => ({ ...prev, targets: event.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <FormLabel>Settings JSON</FormLabel>
                  <Textarea
                    value={schedulePayload.settings}
                    onChange={(event) => setSchedulePayload((prev) => ({ ...prev, settings: event.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-dashed p-3 text-sm space-y-3">
                <div className="font-medium">Test logs</div>
                <div className="space-y-3">
                  <div>
                    <div className="font-medium text-xs mb-2">Members</div>
                    {memberLogs.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No members tests yet.</div>
                    ) : (
                      memberLogs.map((entry, index) => (
                        <div key={`members-log-${index}`} className="rounded border p-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{entry.timestamp}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleCopyLog(entry)}>
                              Copy
                            </Button>
                          </div>
                          <div className="text-xs">Status: {entry.status}</div>
                          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(entry, null, 2)}</pre>
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-xs mb-2">Schedule</div>
                    {scheduleLogs.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No schedule tests yet.</div>
                    ) : (
                      scheduleLogs.map((entry, index) => (
                        <div key={`schedule-log-${index}`} className="rounded border p-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{entry.timestamp}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleCopyLog(entry)}>
                              Copy
                            </Button>
                          </div>
                          <div className="text-xs">Status: {entry.status}</div>
                          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(entry, null, 2)}</pre>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ip_base_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://api.influenceplanner.com/partner/v1/" />
                      </FormControl>
                      <FormDescription>
                        InfluencePlanner Partner API base URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ip_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="InfluencePlanner username" />
                      </FormControl>
                      <FormDescription>
                        Partner account username
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ip_api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        disabled={ipKeyConfigured && ipKeyLocked}
                        value={ipKeyLocked ? field.value : (revealedApiKey ?? field.value)}
                        onChange={(event) => {
                          setRevealedApiKey(null);
                          field.onChange(event);
                        }}
                        placeholder={ipKeyConfigured ? "•••••••• (saved)" : "Enter API key"}
                      />
                    </FormControl>
                    <FormDescription>
                      This key is stored server-side only. Leave blank to keep the current key.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {ipKeyConfigured && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRevealApiKey}
                    disabled={revealingKey || !ipKeyLocked}
                  >
                    {revealingKey ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Revealing...
                      </>
                    ) : (
                      "Reveal key"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLockApiKey}
                    disabled={ipKeyLocked}
                  >
                    Lock key
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !ipKeyConfigured}
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test connection"
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Save settings before testing a new key.
                </span>
                <span className="text-xs text-muted-foreground">
                  {lastTestAt
                    ? `Last test: ${lastTestAt} (${lastTestStatus === "success" ? "success" : "error"})`
                    : "No tests run yet."}
                </span>
              </div>
              {lastTestMessage && (
                <div className={`text-xs ${lastTestStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {lastTestMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLA Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <CardTitle>SLA & Timing Settings</CardTitle>
              </div>
              <CardDescription>
                Configure service level agreements and timing thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="proof_sla_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proof Submission SLA (hours)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="168"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Hours allowed for proof submission
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="decision_sla_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision SLA (hours)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="168"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Hours allowed for decision making
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inactivity_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inactivity Threshold (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Days before marking member inactive
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preview_cache_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preview Cache Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Days to cache preview data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Size Tier Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <CardTitle>Size Tier Thresholds</CardTitle>
                  </div>
                  <CardDescription>
                    Configure follower count thresholds for member size tiers
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTier}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Tier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {form.watch("size_tiers").map((tier, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Tier {index + 1}</h4>
                    {form.watch("size_tiers").length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTier(index)}
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`size_tiers.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Nano, Micro" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`size_tiers.${index}.min`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Followers</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`size_tiers.${index}.max`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Followers</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {index < form.watch("size_tiers").length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};