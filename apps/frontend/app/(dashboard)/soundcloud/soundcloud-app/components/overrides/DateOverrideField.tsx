"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, AlertTriangle, Check } from "lucide-react"
import { format, addDays, isBefore, isAfter } from "date-fns"
import { cn } from "@/lib/utils"

interface DateOverrideFieldProps {
  label: string
  suggestedDate?: Date | null
  selectedDate?: Date | null
  isOverride: boolean
  overrideReason?: string | null
  minDate?: Date
  idealDateRange?: { start: Date; end: Date }
  onOverride: (date: Date, reason: string) => Promise<void>
  onRevert?: () => Promise<void>
  disabled?: boolean
}

export const DateOverrideField = ({
  label,
  suggestedDate,
  selectedDate,
  isOverride,
  overrideReason,
  minDate = addDays(new Date(), 14), // Default: 2 weeks out
  idealDateRange,
  onOverride,
  onRevert,
  disabled = false,
}: DateOverrideFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [draftDate, setDraftDate] = useState<Date | undefined>(
    selectedDate ?? suggestedDate ?? undefined
  )
  const [reason, setReason] = useState("")
  const [showWarning, setShowWarning] = useState(false)

  // Check if selected date is outside ideal range
  useEffect(() => {
    if (draftDate && idealDateRange) {
      const isOutsideIdeal = isBefore(draftDate, idealDateRange.start) || 
                             isAfter(draftDate, idealDateRange.end)
      setShowWarning(isOutsideIdeal)
    } else {
      setShowWarning(false)
    }
  }, [draftDate, idealDateRange])

  const displayDate = selectedDate ?? suggestedDate

  const handleSave = async () => {
    if (!draftDate) return
    
    // If overriding and there's a warning, require reason
    if (showWarning && !reason.trim()) {
      return
    }
    
    await onOverride(draftDate, reason || "Manual date selection")
    setReason("")
    setIsEditing(false)
  }

  const handleRevert = async () => {
    if (onRevert) {
      await onRevert()
      setDraftDate(suggestedDate ?? undefined)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex gap-1">
          {!isOverride && suggestedDate && (
            <Badge variant="secondary" className="text-xs">
              <Check className="w-3 h-3 mr-1" />
              System Suggested
            </Badge>
          )}
          {isOverride && (
            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
              Manual Selection
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled || !isEditing}
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !displayDate && "text-muted-foreground",
                isEditing && "border-primary"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {isEditing && draftDate
                ? format(draftDate, "PPP")
                : displayDate
                ? format(displayDate, "PPP")
                : "Select date"}
            </Button>
          </PopoverTrigger>
          {isEditing && (
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={draftDate}
                onSelect={setDraftDate}
                disabled={(date) => isBefore(date, minDate)}
                initialFocus
                className="pointer-events-auto"
                modifiers={{
                  ideal: idealDateRange 
                    ? { from: idealDateRange.start, to: idealDateRange.end }
                    : undefined,
                }}
                modifiersClassNames={{
                  ideal: "bg-green-100 text-green-900",
                }}
              />
              {idealDateRange && (
                <div className="p-3 border-t text-xs text-muted-foreground">
                  <span className="inline-block w-3 h-3 bg-green-100 rounded mr-1" />
                  Ideal date range: {format(idealDateRange.start, "MMM d")} - {format(idealDateRange.end, "MMM d")}
                </div>
              )}
            </PopoverContent>
          )}
        </Popover>
      </div>

      {isEditing && showWarning && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Date is outside the ideal range</p>
            <p className="text-xs mt-1">
              The system suggests scheduling between{" "}
              {idealDateRange && format(idealDateRange.start, "MMM d")} -{" "}
              {idealDateRange && format(idealDateRange.end, "MMM d")}. 
              Please provide a reason for overriding.
            </p>
          </div>
        </div>
      )}

      {isEditing && (
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={showWarning ? "Reason for date override (required)" : "Reason for date override (optional)"}
          className={showWarning && !reason.trim() ? "border-amber-400" : ""}
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
            {isOverride ? "Change Date" : "Override Date"}
          </Button>
        )}
        {isEditing && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!draftDate || (showWarning && !reason.trim())}
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
                setDraftDate(selectedDate ?? suggestedDate ?? undefined)
              }}
            >
              Cancel
            </Button>
          </>
        )}
        {isOverride && onRevert && !isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRevert}
          >
            Revert to Suggested
          </Button>
        )}
      </div>
    </div>
  )
}
