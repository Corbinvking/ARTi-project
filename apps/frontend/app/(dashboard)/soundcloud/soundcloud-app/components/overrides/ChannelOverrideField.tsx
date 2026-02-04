"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertTriangle,
  Check,
  Users,
  Search,
  X,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
  soundcloud_handle?: string
  soundcloud_followers?: number
  size_tier?: string
  families?: string[]
  influence_planner_status?: string
}

interface ChannelOverrideFieldProps {
  label: string
  suggestedChannels: Member[]
  selectedChannels: Member[]
  allMembers: Member[]
  isOverride: boolean
  overrideReason?: string | null
  sizeMismatchAcknowledged?: boolean
  submissionSizeTier?: string // The submitting artist's size tier
  onOverride: (
    channels: Member[],
    reason: string,
    sizeMismatchAcknowledged: boolean
  ) => Promise<void>
  onRevert?: () => Promise<void>
  disabled?: boolean
}

// Calculate size mismatch warnings
const getSizeMismatchWarnings = (
  channels: Member[],
  submissionTier?: string
): { hasMismatch: boolean; warnings: string[] } => {
  if (!submissionTier) return { hasMismatch: false, warnings: [] }

  const tierOrder = ["T1", "T2", "T3", "T4"]
  const submissionTierIndex = tierOrder.indexOf(submissionTier)
  const warnings: string[] = []

  channels.forEach((channel) => {
    if (!channel.size_tier) return
    const channelTierIndex = tierOrder.indexOf(channel.size_tier)
    const tierDiff = Math.abs(channelTierIndex - submissionTierIndex)

    if (tierDiff >= 2) {
      warnings.push(
        `${channel.name} (${channel.size_tier}) is ${tierDiff} tiers away from submission tier (${submissionTier})`
      )
    }
  })

  return { hasMismatch: warnings.length > 0, warnings }
}

export const ChannelOverrideField = ({
  label,
  suggestedChannels,
  selectedChannels,
  allMembers,
  isOverride,
  overrideReason,
  sizeMismatchAcknowledged = false,
  submissionSizeTier,
  onOverride,
  onRevert,
  disabled = false,
}: ChannelOverrideFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [draftChannels, setDraftChannels] = useState<Member[]>(
    selectedChannels.length > 0 ? selectedChannels : suggestedChannels
  )
  const [reason, setReason] = useState("")
  const [acknowledgedMismatch, setAcknowledgedMismatch] = useState(sizeMismatchAcknowledged)
  const [searchQuery, setSearchQuery] = useState("")
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Filter members by search and connection status
  const availableMembers = useMemo(() => {
    return allMembers
      .filter((m) => m.influence_planner_status === "connected")
      .filter(
        (m) =>
          !searchQuery ||
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.soundcloud_handle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => (b.soundcloud_followers || 0) - (a.soundcloud_followers || 0))
  }, [allMembers, searchQuery])

  // Calculate size mismatch warnings
  const { hasMismatch, warnings } = getSizeMismatchWarnings(
    draftChannels,
    submissionSizeTier
  )

  const displayChannels = selectedChannels.length > 0 ? selectedChannels : suggestedChannels

  const toggleChannel = (member: Member) => {
    setDraftChannels((prev) => {
      const exists = prev.find((m) => m.id === member.id)
      if (exists) {
        return prev.filter((m) => m.id !== member.id)
      }
      return [...prev, member]
    })
  }

  const removeChannel = (memberId: string) => {
    setDraftChannels((prev) => prev.filter((m) => m.id !== memberId))
  }

  const handleSave = async () => {
    if (draftChannels.length === 0) return
    if (hasMismatch && !acknowledgedMismatch) return
    if (!reason.trim() && isOverride) return

    await onOverride(
      draftChannels,
      reason || "Manual channel selection",
      acknowledgedMismatch
    )
    setReason("")
    setIsEditing(false)
  }

  const handleRevert = async () => {
    if (onRevert) {
      await onRevert()
      setDraftChannels(suggestedChannels)
      setAcknowledgedMismatch(false)
    }
  }

  const totalReach = useMemo(() => {
    const channels = isEditing ? draftChannels : displayChannels
    return channels.reduce((sum, m) => sum + (m.soundcloud_followers || 0), 0)
  }, [isEditing, draftChannels, displayChannels])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex gap-1">
          {!isOverride && suggestedChannels.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Check className="w-3 h-3 mr-1" />
              System Suggested
            </Badge>
          )}
          {isOverride && (
            <Badge
              variant="outline"
              className="text-xs bg-amber-50 border-amber-200 text-amber-700"
            >
              Manual Selection
            </Badge>
          )}
        </div>
      </div>

      {/* Selected Channels Display */}
      <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border rounded-md bg-muted/30">
        {(isEditing ? draftChannels : displayChannels).length === 0 ? (
          <span className="text-sm text-muted-foreground">No channels selected</span>
        ) : (
          (isEditing ? draftChannels : displayChannels).map((channel) => (
            <Badge
              key={channel.id}
              variant="secondary"
              className={cn(
                "flex items-center gap-1",
                isEditing && "pr-1"
              )}
            >
              <Users className="w-3 h-3" />
              {channel.name}
              {channel.size_tier && (
                <span className="text-xs opacity-70">({channel.size_tier})</span>
              )}
              {channel.soundcloud_followers && (
                <span className="text-xs opacity-70">
                  • {(channel.soundcloud_followers / 1000).toFixed(1)}k
                </span>
              )}
              {isEditing && (
                <button
                  onClick={() => removeChannel(channel.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))
        )}
      </div>

      {/* Reach Summary */}
      <div className="text-sm text-muted-foreground">
        Total potential reach:{" "}
        <span className="font-medium text-foreground">
          {totalReach.toLocaleString()}
        </span>{" "}
        followers across {(isEditing ? draftChannels : displayChannels).length} channels
      </div>

      {/* Channel Selector (when editing) */}
      {isEditing && (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Add or remove channels
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {availableMembers.map((member) => {
                  const isSelected = draftChannels.some((m) => m.id === member.id)
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer",
                        isSelected && "bg-muted"
                      )}
                      onClick={() => toggleChannel(member)}
                    >
                      <Checkbox checked={isSelected} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.soundcloud_handle && `@${member.soundcloud_handle} • `}
                          {member.size_tier} •{" "}
                          {((member.soundcloud_followers || 0) / 1000).toFixed(1)}k
                          followers
                        </p>
                      </div>
                    </div>
                  )
                })}
                {availableMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No connected members found
                  </p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}

      {/* Size Mismatch Warning */}
      {isEditing && hasMismatch && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Size tier mismatch detected</p>
              <ul className="text-xs mt-1 space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="acknowledge-mismatch"
              checked={acknowledgedMismatch}
              onCheckedChange={(checked) =>
                setAcknowledgedMismatch(checked as boolean)
              }
            />
            <Label
              htmlFor="acknowledge-mismatch"
              className="text-xs text-amber-800 cursor-pointer"
            >
              I acknowledge the size mismatch and want to proceed
            </Label>
          </div>
        </div>
      )}

      {isEditing && (
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for channel override (optional)"
        />
      )}

      {isOverride && overrideReason && !isEditing && (
        <p className="text-xs text-muted-foreground italic">
          Reason: {overrideReason}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!isEditing && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            {isOverride ? "Change Channels" : "Override Channels"}
          </Button>
        )}
        {isEditing && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={
                draftChannels.length === 0 ||
                (hasMismatch && !acknowledgedMismatch)
              }
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false)
                setReason("")
                setDraftChannels(
                  selectedChannels.length > 0 ? selectedChannels : suggestedChannels
                )
                setAcknowledgedMismatch(sizeMismatchAcknowledged)
              }}
            >
              Cancel
            </Button>
          </>
        )}
        {isOverride && onRevert && !isEditing && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRevert}>
            Revert to Suggested
          </Button>
        )}
      </div>
    </div>
  )
}
