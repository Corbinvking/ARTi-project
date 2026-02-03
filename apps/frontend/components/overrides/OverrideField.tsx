import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

type OverrideFieldProps = {
  label: string
  value: string
  suggestedValue?: string
  overridden: boolean
  placeholder?: string
  inputType?: "input" | "textarea"
  rows?: number
  onOverride: (value: string, reason?: string) => Promise<void> | void
  onRevert?: () => Promise<void> | void
}

export const OverrideField = ({
  label,
  value,
  suggestedValue,
  overridden,
  placeholder,
  inputType = "input",
  rows = 3,
  onOverride,
  onRevert,
}: OverrideFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(value || suggestedValue || "")
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value || suggestedValue || "")
    }
  }, [isEditing, value, suggestedValue])

  const InputComponent = inputType === "textarea" ? Textarea : Input

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {!overridden && suggestedValue && (
          <Badge variant="secondary">Suggested by system</Badge>
        )}
        {overridden && <Badge variant="outline">Overridden</Badge>}
      </div>

      <InputComponent
        value={isEditing ? draftValue : value || suggestedValue || ""}
        onChange={(event: any) => setDraftValue(event.target.value)}
        placeholder={placeholder}
        rows={inputType === "textarea" ? rows : undefined}
        disabled={!isEditing}
      />

      {isEditing && (
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Override reason (optional)"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {!overridden && !isEditing && (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Override
          </Button>
        )}
        {isEditing && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                await onOverride(draftValue, reason)
                setReason("")
                setIsEditing(false)
              }}
            >
              Save Override
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false)
                setReason("")
              }}
            >
              Cancel
            </Button>
          </>
        )}
        {overridden && onRevert && !isEditing && (
          <Button type="button" variant="ghost" size="sm" onClick={onRevert}>
            Revert to Suggested
          </Button>
        )}
      </div>
    </div>
  )
}
