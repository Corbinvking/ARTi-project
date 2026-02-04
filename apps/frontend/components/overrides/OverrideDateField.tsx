import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

type OverrideDateFieldProps = {
  label: string
  value?: Date
  suggestedValue?: Date
  onSelect: (date: Date | undefined, reason?: string) => Promise<void> | void
  onRevert?: () => Promise<void> | void
  disabled?: boolean
  placeholder?: string
  disabledDates?: (date: Date) => boolean
  modal?: boolean
}

export const OverrideDateField = ({
  label,
  value,
  suggestedValue,
  onSelect,
  onRevert,
  disabled = false,
  placeholder = "Pick a date",
  disabledDates,
  modal = true,
}: OverrideDateFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [draftDate, setDraftDate] = useState<Date | undefined>(value)
  const [reason, setReason] = useState("")
  const [open, setOpen] = useState(false)

  // Determine if the current value is different from suggested
  const isOverridden = suggestedValue && value
    ? value.getTime() !== suggestedValue.getTime()
    : false

  const displayDate = value || suggestedValue

  const handleSaveOverride = async () => {
    if (draftDate) {
      await onSelect(draftDate, reason)
    }
    setReason("")
    setIsEditing(false)
    setOpen(false)
  }

  const handleRevert = async () => {
    if (onRevert) {
      await onRevert()
    }
    setDraftDate(suggestedValue)
    setIsEditing(false)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setDraftDate(date)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {!isOverridden && suggestedValue && (
          <Badge variant="secondary" className="text-xs">Suggested by system</Badge>
        )}
        {isOverridden && <Badge variant="outline" className="text-xs">Overridden</Badge>}
      </div>

      <Popover open={open} onOpenChange={setOpen} modal={modal}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !displayDate && "text-muted-foreground"
            )}
            disabled={disabled}
            onClick={() => {
              if (!isEditing && !isOverridden) {
                setIsEditing(true)
              }
              setDraftDate(value || suggestedValue)
            }}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayDate ? format(displayDate, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[9999] bg-popover border shadow-lg" sideOffset={5}>
          <Calendar
            mode="single"
            selected={draftDate}
            onSelect={handleDateSelect}
            disabled={disabledDates}
            initialFocus
            className="bg-background"
          />
          <div className="p-3 border-t space-y-2">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Override reason (optional)"
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveOverride}
                disabled={!draftDate}
              >
                {isOverridden ? "Update" : "Save Override"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false)
                  setReason("")
                  setIsEditing(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {isOverridden && onRevert && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRevert}
          className="text-xs h-7 px-2"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Revert to Suggested
        </Button>
      )}
    </div>
  )
}
