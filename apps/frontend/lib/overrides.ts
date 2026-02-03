import { supabase } from "@/lib/auth"

export type OverrideRecord = {
  field_key: string
  original_value?: string | null
  override_value?: string | null
  override_reason?: string | null
  overridden_by?: string | null
  overridden_at?: string | null
  reverted_at?: string | null
}

const serializeValue = (value: unknown) => {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const fetchOverrides = async ({
  service,
  campaignId,
}: {
  service: string
  campaignId: string
}) => {
  const { data, error } = await (supabase as any)
    .from("campaign_field_overrides")
    .select(
      "field_key, original_value, override_value, override_reason, overridden_by, overridden_at, reverted_at",
    )
    .eq("service", service)
    .eq("campaign_id", campaignId)
    .is("reverted_at", null)

  if (error) throw error

  const overrides: Record<string, OverrideRecord> = {}
  ;(data || []).forEach((row: OverrideRecord) => {
    overrides[row.field_key] = row
  })
  return overrides
}

export const saveOverride = async ({
  service,
  campaignId,
  fieldKey,
  originalValue,
  overrideValue,
  overrideReason,
  orgId,
  overriddenBy,
}: {
  service: string
  campaignId: string
  fieldKey: string
  originalValue?: unknown
  overrideValue?: unknown
  overrideReason?: string
  orgId: string
  overriddenBy?: string | null
}) => {
  const original = serializeValue(originalValue)
  const override = serializeValue(overrideValue)

  await (supabase as any)
    .from("campaign_field_overrides")
    .update({ reverted_at: new Date().toISOString() })
    .eq("service", service)
    .eq("campaign_id", campaignId)
    .eq("field_key", fieldKey)
    .is("reverted_at", null)

  const { error } = await (supabase as any).from("campaign_field_overrides").insert({
    org_id: orgId,
    service,
    campaign_id: campaignId,
    field_key: fieldKey,
    original_value: original,
    override_value: override,
    override_reason: overrideReason || null,
    overridden_by: overriddenBy || null,
  })

  if (error) throw error
}

export const revertOverride = async ({
  service,
  campaignId,
  fieldKey,
}: {
  service: string
  campaignId: string
  fieldKey: string
}) => {
  const { error } = await (supabase as any)
    .from("campaign_field_overrides")
    .update({ reverted_at: new Date().toISOString() })
    .eq("service", service)
    .eq("campaign_id", campaignId)
    .eq("field_key", fieldKey)
    .is("reverted_at", null)

  if (error) throw error
}
