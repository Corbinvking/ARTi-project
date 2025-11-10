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
  const { toast } = useToast();

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
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        // Handle both old format (T1-T4 object) and new format (array)
        let sizeTiers;
        if (Array.isArray(data.size_tier_thresholds)) {
          sizeTiers = data.size_tier_thresholds;
        } else if (data.size_tier_thresholds) {
          // Convert old format to new format
          const oldFormat = data.size_tier_thresholds as any;
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
          slack_enabled: data.slack_enabled || false,
          slack_channel: data.slack_channel || "#soundcloud-groups",
          slack_webhook: data.slack_webhook || "",
          preview_cache_days: data.preview_cache_days || 30,
          inactivity_days: data.inactivity_days || 90,
          proof_sla_hours: data.proof_sla_hours || 24,
          decision_sla_hours: data.decision_sla_hours || 24,
          size_tiers: sizeTiers,
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
        .from("settings")
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