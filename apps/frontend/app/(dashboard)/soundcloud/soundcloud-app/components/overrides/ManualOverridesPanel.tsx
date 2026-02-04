"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { DateOverrideField } from "./DateOverrideField"
import { ChannelOverrideField } from "./ChannelOverrideField"
import { RepostLimitOverrideField } from "./RepostLimitOverrideField"
import { supabase } from "../../integrations/supabase/client"
import { useToast } from "../../hooks/use-toast"
import { Settings2, AlertCircle } from "lucide-react"
import { addDays } from "date-fns"

interface Member {
  id: string
  name: string
  soundcloud_handle?: string
  soundcloud_followers?: number
  size_tier?: string
  families?: string[]
  influence_planner_status?: string
}

interface ManualOverridesPanelProps {
  submissionId: string
  submissionType: "submission" | "campaign"
  // Current values from the submission/campaign
  suggestedDate?: Date | null
  selectedDate?: Date | null
  dateIsOverride?: boolean
  dateOverrideReason?: string | null
  suggestedChannels?: Member[]
  selectedChannels?: Member[]
  channelIsOverride?: boolean
  channelOverrideReason?: string | null
  channelSizeMismatchAcknowledged?: boolean
  repostLimitPerProfile?: number
  repostLimitIsOverride?: boolean
  repostLimitOverrideReason?: string | null
  submissionSizeTier?: string
  isAdmin?: boolean
  onUpdate?: () => void
}

export const ManualOverridesPanel = ({
  submissionId,
  submissionType,
  suggestedDate,
  selectedDate,
  dateIsOverride = false,
  dateOverrideReason,
  suggestedChannels = [],
  selectedChannels = [],
  channelIsOverride = false,
  channelOverrideReason,
  channelSizeMismatchAcknowledged = false,
  repostLimitPerProfile = 2,
  repostLimitIsOverride = false,
  repostLimitOverrideReason,
  submissionSizeTier,
  isAdmin = false,
  onUpdate,
}: ManualOverridesPanelProps) => {
  const { toast } = useToast()
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch all connected members for channel selection
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("members")
          .select(
            "id, name, soundcloud_handle, soundcloud_followers, size_tier, families, influence_planner_status"
          )
          .eq("influence_planner_status", "connected")
          .order("soundcloud_followers", { ascending: false })

        if (error) throw error
        setAllMembers(data || [])
      } catch (error) {
        console.error("Failed to fetch members:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  // Calculate ideal date range (2-4 weeks from now)
  const idealDateRange = {
    start: addDays(new Date(), 14),
    end: addDays(new Date(), 28),
  }

  // Handle date override
  const handleDateOverride = async (date: Date, reason: string) => {
    try {
      const tableName = submissionType === "submission" ? "submissions" : "soundcloud_campaigns"
      const dateField = submissionType === "submission" ? "support_date" : "start_date"

      const { error } = await supabase
        .from(tableName)
        .update({
          [dateField]: date.toISOString().split("T")[0],
          date_is_override: true,
          date_override_reason: reason,
          date_override_at: new Date().toISOString(),
        })
        .eq("id", submissionId)

      if (error) throw error

      // Record in override history
      await supabase.rpc("record_soundcloud_override", {
        p_parent_type: submissionType,
        p_parent_id: submissionId,
        p_override_type: "date",
        p_previous_value: JSON.stringify({ date: selectedDate || suggestedDate }),
        p_new_value: JSON.stringify({ date: date.toISOString() }),
        p_reason: reason,
        p_user_id: (await supabase.auth.getUser()).data.user?.id || null,
      })

      toast({
        title: "Date Updated",
        description: "Scheduling date has been overridden",
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update date",
        variant: "destructive",
      })
    }
  }

  // Handle date revert
  const handleDateRevert = async () => {
    try {
      const tableName = submissionType === "submission" ? "submissions" : "soundcloud_campaigns"
      const dateField = submissionType === "submission" ? "support_date" : "start_date"

      const { error } = await supabase
        .from(tableName)
        .update({
          [dateField]: suggestedDate ? suggestedDate.toISOString().split("T")[0] : null,
          date_is_override: false,
          date_override_reason: null,
          date_override_at: null,
        })
        .eq("id", submissionId)

      if (error) throw error

      toast({
        title: "Date Reverted",
        description: "Scheduling date has been reverted to system suggestion",
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revert date",
        variant: "destructive",
      })
    }
  }

  // Handle channel override
  const handleChannelOverride = async (
    channels: Member[],
    reason: string,
    sizeMismatchAcknowledged: boolean
  ) => {
    try {
      const tableName = submissionType === "submission" ? "submissions" : "soundcloud_campaigns"
      const channelIds = channels.map((c) => c.id)

      const { error } = await supabase
        .from(tableName)
        .update({
          selected_channels: channelIds,
          channel_is_override: true,
          channel_override_reason: reason,
          channel_size_mismatch_acknowledged: sizeMismatchAcknowledged,
          channel_override_at: new Date().toISOString(),
        })
        .eq("id", submissionId)

      if (error) throw error

      // Record in override history
      await supabase.rpc("record_soundcloud_override", {
        p_parent_type: submissionType,
        p_parent_id: submissionId,
        p_override_type: "channel",
        p_previous_value: JSON.stringify({
          channels: selectedChannels.map((c) => c.id),
        }),
        p_new_value: JSON.stringify({ channels: channelIds }),
        p_reason: reason,
        p_user_id: (await supabase.auth.getUser()).data.user?.id || null,
      })

      toast({
        title: "Channels Updated",
        description: `${channels.length} channels selected`,
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update channels",
        variant: "destructive",
      })
    }
  }

  // Handle channel revert
  const handleChannelRevert = async () => {
    try {
      const tableName = submissionType === "submission" ? "submissions" : "soundcloud_campaigns"
      const suggestedIds = suggestedChannels.map((c) => c.id)

      const { error } = await supabase
        .from(tableName)
        .update({
          selected_channels: suggestedIds,
          channel_is_override: false,
          channel_override_reason: null,
          channel_size_mismatch_acknowledged: false,
          channel_override_at: null,
        })
        .eq("id", submissionId)

      if (error) throw error

      toast({
        title: "Channels Reverted",
        description: "Channel selection has been reverted to system suggestion",
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revert channels",
        variant: "destructive",
      })
    }
  }

  // Handle repost limit override
  const handleRepostLimitOverride = async (limit: number, reason: string) => {
    try {
      const tableName = submissionType === "submission" ? "submissions" : "soundcloud_campaigns"

      const { error } = await supabase
        .from(tableName)
        .update({
          repost_limit_per_profile: limit,
          repost_limit_is_override: true,
          repost_limit_override_reason: reason,
          repost_limit_override_at: new Date().toISOString(),
        })
        .eq("id", submissionId)

      if (error) throw error

      // Record in override history
      await supabase.rpc("record_soundcloud_override", {
        p_parent_type: submissionType,
        p_parent_id: submissionId,
        p_override_type: "repost_limit",
        p_previous_value: JSON.stringify({ limit: repostLimitPerProfile }),
        p_new_value: JSON.stringify({ limit }),
        p_reason: reason,
        p_user_id: (await supabase.auth.getUser()).data.user?.id || null,
      })

      toast({
        title: "Repost Limit Updated",
        description: `Limit set to ${limit} reposts per profile per day`,
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update repost limit",
        variant: "destructive",
      })
    }
  }

  // Handle repost limit revert
  const handleRepostLimitRevert = async () => {
    try {
      const tableName = submissionType === "submission" ? "submissions" : "soundcloud_campaigns"

      const { error } = await supabase
        .from(tableName)
        .update({
          repost_limit_per_profile: 2,
          repost_limit_is_override: false,
          repost_limit_override_reason: null,
          repost_limit_override_at: null,
        })
        .eq("id", submissionId)

      if (error) throw error

      toast({
        title: "Repost Limit Reverted",
        description: "Repost limit has been reverted to default (2/day)",
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revert repost limit",
        variant: "destructive",
      })
    }
  }

  const hasAnyOverride = dateIsOverride || channelIsOverride || repostLimitIsOverride

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Manual Overrides</CardTitle>
          </div>
          {hasAnyOverride && (
            <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
              <AlertCircle className="w-3 h-3 mr-1" />
              {[dateIsOverride, channelIsOverride, repostLimitIsOverride].filter(
                Boolean
              ).length}{" "}
              active override(s)
            </Badge>
          )}
        </div>
        <CardDescription>
          System suggestions can be overridden by ops. All overrides are tracked
          and logged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Override */}
        <DateOverrideField
          label="Scheduling Date"
          suggestedDate={suggestedDate}
          selectedDate={selectedDate}
          isOverride={dateIsOverride}
          overrideReason={dateOverrideReason}
          minDate={addDays(new Date(), 14)}
          idealDateRange={idealDateRange}
          onOverride={handleDateOverride}
          onRevert={handleDateRevert}
        />

        <Separator />

        {/* Channel Override */}
        <ChannelOverrideField
          label="Repost Channels"
          suggestedChannels={suggestedChannels}
          selectedChannels={selectedChannels}
          allMembers={allMembers}
          isOverride={channelIsOverride}
          overrideReason={channelOverrideReason}
          sizeMismatchAcknowledged={channelSizeMismatchAcknowledged}
          submissionSizeTier={submissionSizeTier}
          onOverride={handleChannelOverride}
          onRevert={handleChannelRevert}
        />

        <Separator />

        {/* Repost Limit Override */}
        <RepostLimitOverrideField
          label="Repost Limit per Profile"
          defaultLimit={2}
          currentLimit={repostLimitPerProfile}
          isOverride={repostLimitIsOverride}
          overrideReason={repostLimitOverrideReason}
          isAdmin={isAdmin}
          onOverride={handleRepostLimitOverride}
          onRevert={handleRepostLimitRevert}
        />
      </CardContent>
    </Card>
  )
}
