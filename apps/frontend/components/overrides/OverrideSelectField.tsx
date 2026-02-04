import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RotateCcw } from "lucide-react"

type SelectOption = {
  value: string
  label: string
}

type OverrideSelectFieldProps = {
  label: string
  value?: string
  suggestedValue?: string
  options: SelectOption[]
  onValueChange: (value: string, reason?: string) => Promise<void> | void
  onRevert?: () => Promise<void> | void
  disabled?: boolean
  placeholder?: string
}

export const OverrideSelectField = ({
  label,
  value,
  suggestedValue,
  options,
  onValueChange,
  onRevert,
  disabled = false,
  placeholder = "Select an option",
}: OverrideSelectFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [pendingValue, setPendingValue] = useState<string | undefined>(undefined)
  const [reason, setReason] = useState("")

  // Determine if the current value is different from suggested
  const isOverridden = suggestedValue && value ? value !== suggestedValue : false

  const displayValue = value || suggestedValue

  const handleValueSelect = (newValue: string) => {
    if (newValue !== displayValue) {
      setPendingValue(newValue)
      setIsEditing(true)
    }
  }

  const handleSaveOverride = async () => {
    if (pendingValue) {
      await onValueChange(pendingValue, reason)
    }
    setReason("")
    setPendingValue(undefined)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setPendingValue(undefined)
    setReason("")
    setIsEditing(false)
  }

  const handleRevert = async () => {
    if (onRevert) {
      await onRevert()
    }
    setPendingValue(undefined)
    setReason("")
    setIsEditing(false)
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

      <Select
        value={pendingValue || displayValue || ""}
        onValueChange={handleValueSelect}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isEditing && pendingValue && (
        <div className="space-y-2 p-2 border rounded-md bg-muted/30">
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
            >
              Save Override
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isOverridden && onRevert && !isEditing && (
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
