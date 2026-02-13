"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Loader2,
  Radio,
  Settings2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "../../integrations/supabase/client"
import { useToast } from "../../hooks/use-toast"
import { format } from "date-fns"

// ----- Types -----

interface SlotSuggestion {
  date: string
  quality: "ideal" | "acceptable" | "not_ideal"
  existingCampaigns: number
  reason: string
}

interface ChannelSuggestion {
  user_id: string
  name: string
  followers: number
  profile_url: string
  image_url: string
  score: number
  suggested: boolean
  reason: string
  genre_family_names?: string[]
}

interface ScheduleSuggestionPanelProps {
  submissionId: string
  trackUrl: string
  campaignType: "paid" | "free"
  currentDate?: string | null
  dateIsOverride?: boolean
  goalReposts?: number
  onScheduleCreated?: (scheduleUrls: string[]) => void
  onUpdate?: () => void
  /** When true (e.g. modal opened), refetches channels so genre tags stay in sync after Settings changes */
  isVisible?: boolean
}

// ----- Component -----

export const ScheduleSuggestionPanel = ({
  submissionId,
  trackUrl,
  campaignType,
  currentDate,
  dateIsOverride = false,
  goalReposts = 0,
  onScheduleCreated,
  onUpdate,
  isVisible = true,
}: ScheduleSuggestionPanelProps) => {
  const { toast } = useToast()

  // Slot state
  const [slotSuggestions, setSlotSuggestions] = useState<SlotSuggestion[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(currentDate || null)
  const [slotOverridden, setSlotOverridden] = useState(dateIsOverride)
  const [customDate, setCustomDate] = useState("")

  // Channel state
  const [channelSuggestions, setChannelSuggestions] = useState<ChannelSuggestion[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())
  const [channelsOverridden, setChannelsOverridden] = useState(false)

  // Channel loading progress
  const [channelProgress, setChannelProgress] = useState<{
    phase: string
    membersLoaded: number
    totalMembers: number | null
    page: number
    totalPages: number | null
  }>({ phase: "", membersLoaded: 0, totalMembers: null, page: 0, totalPages: null })

  // Schedule state
  const [scheduling, setScheduling] = useState(false)

  // Get auth token for API calls
  const getAuthToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  }

  // ----- Fetch Slot Suggestions -----
  const fetchSlotSuggestions = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const token = await getAuthToken()
      if (!token) throw new Error("Not authenticated")

      const res = await fetch("/api/soundcloud/influenceplanner/suggest-slots?days=21", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error("Failed to fetch slots")

      const data = await res.json()
      setSlotSuggestions(data.suggestions || [])

      // Auto-select the best slot if none chosen
      if (!selectedSlot && data.suggestions?.length > 0) {
        setSelectedSlot(data.suggestions[0].date)
      }
    } catch (err: any) {
      console.error("Error fetching slot suggestions:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to load scheduling suggestions",
        variant: "destructive",
      })
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedSlot])

  // ----- Fetch Channel Suggestions (streaming with progress) -----
  const fetchChannelSuggestions = useCallback(async () => {
    setLoadingChannels(true)
    setChannelProgress({ phase: "connecting", membersLoaded: 0, totalMembers: null, page: 0, totalPages: null })
    try {
      const token = await getAuthToken()
      if (!token) throw new Error("Not authenticated")

      const params = new URLSearchParams()
      if (goalReposts > 0) params.set("targetReach", String(goalReposts))
      params.set("stream", "true")
      params.set("_t", String(Date.now())) // cache-bust so genres always match Settings

      const res = await fetch(
        `/api/soundcloud/influenceplanner/suggest-channels?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      )

      if (!res.ok) throw new Error("Failed to fetch channels")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Streaming not supported")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.type === "progress") {
              setChannelProgress({
                phase: event.phase,
                membersLoaded: event.membersLoaded,
                totalMembers: event.totalMembers,
                page: event.page,
                totalPages: event.totalPages,
              })
            } else if (event.type === "result") {
              setChannelSuggestions(event.channels || [])
              const suggested = (event.channels || [])
                .filter((c: ChannelSuggestion) => c.suggested)
                .map((c: ChannelSuggestion) => c.user_id)
              setSelectedChannels(new Set(suggested))
            } else if (event.type === "error") {
              throw new Error(event.error)
            }
          } catch (parseErr: any) {
            if (parseErr.message && parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching channel suggestions:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to load channel suggestions",
        variant: "destructive",
      })
    } finally {
      setLoadingChannels(false)
    }
  }, [goalReposts])

  // Load suggestions when panel is visible (e.g. modal opened); refetch when visibility becomes true so genre deletes in Settings are reflected
  useEffect(() => {
    if (isVisible) {
      fetchSlotSuggestions()
      fetchChannelSuggestions()
    }
  }, [isVisible])

  // ----- Handlers -----

  const handleSlotSelect = (date: string) => {
    const suggestion = slotSuggestions.find((s) => s.date === date)
    setSelectedSlot(date)

    // If user picks a slot different from the top suggestion, mark as override
    const isTopSuggestion = slotSuggestions.length > 0 && slotSuggestions[0].date === date
    setSlotOverridden(!isTopSuggestion)
  }

  const handleCustomDateApply = () => {
    if (customDate) {
      setSelectedSlot(customDate)
      setSlotOverridden(true)
    }
  }

  const toggleChannel = (userId: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
    setChannelsOverridden(true)
  }

  const selectAllSuggested = () => {
    const suggested = channelSuggestions
      .filter((c) => c.suggested)
      .map((c) => c.user_id)
    setSelectedChannels(new Set(suggested))
    setChannelsOverridden(false)
  }

  // ----- Execute Schedule -----
  const handleExecuteSchedule = async () => {
    if (!selectedSlot) {
      toast({
        title: "No Date Selected",
        description: "Please select a scheduling date",
        variant: "destructive",
      })
      return
    }

    if (selectedChannels.size === 0) {
      toast({
        title: "No Channels Selected",
        description: "Please select at least one channel",
        variant: "destructive",
      })
      return
    }

    setScheduling(true)
    try {
      const token = await getAuthToken()
      if (!token) throw new Error("Not authenticated")

      // Build the schedule payload for Influence Planner API
      const schedulePayload = {
        types: ["REPOST", "UNREPOST"],
        medias: [trackUrl],
        targets: Array.from(selectedChannels),
        settings: {
          date: new Date(selectedSlot + "T12:00:00.000Z").toISOString(),
          unrepostAfterHours: 24,
          spreadBetweenAccountsMinutes: 60,
          spreadBetweenTracksMinutes: 60,
        },
        removeDuplicates: true,
        shuffle: true,
      }

      // Call the existing schedule creation endpoint
      const res = await fetch("/api/soundcloud/influenceplanner/schedule", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(schedulePayload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Schedule creation failed (${res.status})`)
      }

      const result = await res.json()
      const scheduleUrls: string[] = result.body?.data || []

      // Store schedule URLs and update submission record
      const updatePayload: Record<string, any> = {
        support_date: selectedSlot,
        date_is_override: slotOverridden,
        channel_is_override: channelsOverridden,
        ip_schedule_urls: scheduleUrls,
        ip_schedule_id: scheduleUrls[0]?.split("/").pop() || null,
        suggested_dates: JSON.stringify(slotSuggestions.slice(0, 5)),
        selected_channels: Array.from(selectedChannels),
        status: "active",
        updated_at: new Date().toISOString(),
      }

      if (slotOverridden) {
        updatePayload.date_override_reason = "Manual date selection during scheduling"
        updatePayload.date_override_at = new Date().toISOString()
      }

      if (channelsOverridden) {
        updatePayload.channel_override_reason = "Manual channel selection during scheduling"
        updatePayload.channel_override_at = new Date().toISOString()
      }

      await supabase
        .from("soundcloud_submissions")
        .update(updatePayload)
        .eq("id", submissionId)

      toast({
        title: "Schedule Created",
        description: `Campaign scheduled for ${selectedSlot && !isNaN(new Date(selectedSlot).getTime()) ? format(new Date(selectedSlot), "MMM d, yyyy") : selectedSlot} with ${selectedChannels.size} channels`,
      })

      onScheduleCreated?.(scheduleUrls)
      onUpdate?.()
    } catch (err: any) {
      console.error("Error creating schedule:", err)
      toast({
        title: "Scheduling Failed",
        description: err.message || "Failed to create schedule via Influence Planner",
        variant: "destructive",
      })
    } finally {
      setScheduling(false)
    }
  }

  // ----- Helpers -----

  const getQualityBadge = (quality: SlotSuggestion["quality"]) => {
    switch (quality) {
      case "ideal":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <Check className="h-3 w-3 mr-1" /> Ideal
          </Badge>
        )
      case "acceptable":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Acceptable
          </Badge>
        )
      case "not_ideal":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <AlertTriangle className="h-3 w-3 mr-1" /> Not Ideal
          </Badge>
        )
    }
  }

  const estimatedReach = Array.from(selectedChannels).reduce((sum, userId) => {
    const ch = channelSuggestions.find((c) => c.user_id === userId)
    return sum + Math.round((ch?.followers || 0) * 0.06)
  }, 0)

  // ----- Render -----

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Schedule via Influence Planner</CardTitle>
          </div>
          {(slotOverridden || channelsOverridden) && (
            <Badge
              variant="outline"
              className="bg-amber-50 border-amber-200 text-amber-700"
            >
              <Settings2 className="w-3 h-3 mr-1" />
              Manual Selection
            </Badge>
          )}
        </div>
        <CardDescription>
          System suggests optimal dates and channels. Override as needed -- all
          overrides are tracked.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ----- Slot Suggestions ----- */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Scheduling Date</Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSlotSuggestions}
              disabled={loadingSlots}
            >
              {loadingSlots ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          {loadingSlots ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing calendar...
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {slotSuggestions.slice(0, 10).map((slot) => (
                  <div
                    key={slot.date}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors",
                      selectedSlot === slot.date
                        ? "bg-primary/10 border-primary/50"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleSlotSelect(slot.date)}
                  >
                    <div className="flex items-center gap-3">
                      <Radio
                        className={cn(
                          "h-4 w-4",
                          selectedSlot === slot.date
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      />
                      <div>
                        <div className="text-sm font-medium">
                          {slot.date && !isNaN(new Date(slot.date + "T00:00:00").getTime()) ? format(new Date(slot.date + "T00:00:00"), "EEE, MMM d, yyyy") : slot.date || "TBD"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {slot.reason}
                        </div>
                      </div>
                    </div>
                    {getQualityBadge(slot.quality)}
                  </div>
                ))}
              </div>

              {/* Custom date override */}
              <div className="flex items-center gap-2 mt-3">
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-48"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCustomDateApply}
                  disabled={!customDate}
                >
                  Use Custom Date
                </Button>
              </div>

              {slotOverridden && selectedSlot && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs text-amber-800">
                    Date manually selected. This will be recorded as a manual override.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* ----- Channel Suggestions ----- */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                Repost Channels ({selectedChannels.size} selected)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllSuggested}
              >
                Reset to Suggested
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchChannelSuggestions}
                disabled={loadingChannels}
              >
                {loadingChannels ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </div>

          {/* Estimated reach */}
          <div className="flex items-center gap-4 mb-3 p-2 bg-muted/50 rounded-md">
            <div className="text-sm">
              <span className="text-muted-foreground">Est. reach: </span>
              <span className="font-medium">
                {estimatedReach.toLocaleString()}
              </span>
            </div>
            {goalReposts > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Target: </span>
                <span className="font-medium">
                  {goalReposts.toLocaleString()}
                </span>
                {estimatedReach >= goalReposts ? (
                  <Badge className="ml-2 bg-green-100 text-green-800 border-green-300 text-xs">
                    Target met
                  </Badge>
                ) : (
                  <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-300 text-xs">
                    Below target
                  </Badge>
                )}
              </div>
            )}
          </div>

          {loadingChannels ? (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {channelProgress.phase === "connecting"
                    ? "Connecting to Influence Planner..."
                    : channelProgress.phase === "scoring"
                    ? "Scoring and ranking channels..."
                    : channelProgress.totalMembers
                    ? `Loading members (${channelProgress.membersLoaded} of ${channelProgress.totalMembers})...`
                    : `Loading members (${channelProgress.membersLoaded} found)...`}
                </div>
                {channelProgress.totalPages && channelProgress.phase === "fetching" && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Page {channelProgress.page}/{channelProgress.totalPages}
                  </span>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{
                    width: channelProgress.phase === "scoring"
                      ? "95%"
                      : channelProgress.totalMembers && channelProgress.totalMembers > 0
                      ? `${Math.min(90, (channelProgress.membersLoaded / channelProgress.totalMembers) * 90)}%`
                      : channelProgress.phase === "connecting"
                      ? "5%"
                      : "10%",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {channelSuggestions.map((channel) => (
                <div
                  key={channel.user_id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-colors",
                    selectedChannels.has(channel.user_id)
                      ? "bg-primary/5 border-primary/30"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedChannels.has(channel.user_id)}
                      onCheckedChange={() => toggleChannel(channel.user_id)}
                    />
                    {channel.image_url && (
                      <img
                        src={channel.image_url}
                        alt={channel.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium">{channel.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{channel.followers.toLocaleString()} followers</span>
                        {channel.genre_family_names?.length ? (
                          <>
                            <span className="text-muted-foreground/60">·</span>
                            <span>{channel.genre_family_names.join(", ")}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channel.suggested && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 text-xs"
                      >
                        Suggested
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Score: {channel.score}
                    </span>
                  </div>
                </div>
              ))}

              {channelSuggestions.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No channels available. Check Influence Planner connection.
                </div>
              )}
            </div>
          )}

          {channelsOverridden && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <Settings2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-800">
                Channel selection manually modified. Override will be recorded.
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* ----- Execute Schedule Button ----- */}
        <div className="pt-2">
          <Button
            onClick={handleExecuteSchedule}
            disabled={scheduling || !selectedSlot || selectedChannels.size === 0}
            className="w-full"
            size="lg"
          >
            {scheduling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Schedule...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Schedule Campaign
                {selectedSlot && !isNaN(new Date(selectedSlot + "T00:00:00").getTime()) && (
                  <span className="ml-1 text-xs opacity-75">
                    ({format(new Date(selectedSlot + "T00:00:00"), "MMM d")} - {selectedChannels.size} channels)
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
