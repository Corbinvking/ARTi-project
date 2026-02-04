"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Shield, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface RepostLimitOverrideFieldProps {
  label: string
  defaultLimit?: number // Default is 2 reposts/day/profile
  currentLimit: number
  isOverride: boolean
  overrideReason?: string | null
  isAdmin: boolean
  onOverride: (limit: number, reason: string) => Promise<void>
  onRevert?: () => Promise<void>
  disabled?: boolean
}

export const RepostLimitOverrideField = ({
  label,
  defaultLimit = 2,
  currentLimit,
  isOverride,
  overrideReason,
  isAdmin,
  onOverride,
  onRevert,
  disabled = false,
}: RepostLimitOverrideFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [draftLimit, setDraftLimit] = useState(currentLimit.toString())
  const [reason, setReason] = useState("")

  const limitValue = parseInt(draftLimit) || defaultLimit
  const isExceedingDefault = limitValue > defaultLimit

  const handleSave = () => {
    if (!reason.trim()) return
    
    // Show confirmation dialog if exceeding default
    if (isExceedingDefault) {
      setShowConfirmDialog(true)
    } else {
      performSave()
    }
  }

  const performSave = async () => {
    await onOverride(limitValue, reason)
    setReason("")
    setIsEditing(false)
    setShowConfirmDialog(false)
  }

  const handleRevert = async () => {
    if (onRevert) {
      await onRevert()
      setDraftLimit(defaultLimit.toString())
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            {label}
          </Label>
          <Badge variant="secondary" className="text-xs">
            Admin Only
          </Badge>
        </div>
        <div className="p-3 bg-muted/30 border rounded-md">
          <p className="text-sm">
            Current limit: <span className="font-medium">{currentLimit}</span>{" "}
            reposts per profile per day
          </p>
          {isOverride && overrideReason && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              Override: {overrideReason}
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Only administrators can modify repost limits
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          {label}
        </Label>
        <div className="flex gap-1">
          {!isOverride && (
            <Badge variant="secondary" className="text-xs">
              Default: {defaultLimit}/day
            </Badge>
          )}
          {isOverride && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                currentLimit > defaultLimit
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              )}
            >
              Override Active
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Select
          value={isEditing ? draftLimit : currentLimit.toString()}
          onValueChange={setDraftLimit}
          disabled={disabled || !isEditing}
        >
          <SelectTrigger className={cn("w-32", isEditing && "border-primary")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 repost/day</SelectItem>
            <SelectItem value="2">2 reposts/day</SelectItem>
            <SelectItem value="3">3 reposts/day</SelectItem>
            <SelectItem value="4">4 reposts/day</SelectItem>
            <SelectItem value="5">5 reposts/day</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">per profile</span>
      </div>

      {isEditing && isExceedingDefault && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-medium">Exceeding recommended limit</p>
            <p className="text-xs mt-1">
              The default of {defaultLimit} reposts per day per profile is
              already enforced within Influence Planner. Exceeding this may
              cause scheduling conflicts or account issues.
            </p>
          </div>
        </div>
      )}

      {isEditing && (
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for override (required)"
          className={!reason.trim() ? "border-amber-400" : ""}
        />
      )}

      {isOverride && overrideReason && !isEditing && (
        <p className="text-xs text-muted-foreground italic">
          Reason: {overrideReason}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!isEditing && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            {isOverride ? "Change Limit" : "Override Limit"}
          </Button>
        )}
        {isEditing && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!reason.trim()}
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
                setDraftLimit(currentLimit.toString())
              }}
            >
              Cancel
            </Button>
          </>
        )}
        {isOverride && onRevert && !isEditing && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRevert}>
            Revert to Default
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirm Repost Limit Override
            </DialogTitle>
            <DialogDescription>
              You are about to set the repost limit to{" "}
              <strong>{limitValue} reposts per day per profile</strong>, which
              exceeds the recommended default of {defaultLimit}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to proceed? This may cause:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Scheduling conflicts in Influence Planner</li>
              <li>Potential account flagging on SoundCloud</li>
              <li>Reduced effectiveness of reposts</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={performSave}>
              Yes, Override Limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
