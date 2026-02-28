import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "crypto"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET

function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false
  const hmac = createHmac("sha256", WEBHOOK_SECRET)
  hmac.update(payload, "utf-8")
  const digest = `sha256=${hmac.digest("hex")}`
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}

type AppStatus = "open" | "in_progress" | "complete"

function resolveStatus(
  action: string,
  labelName?: string,
  issueState?: string
): AppStatus | null {
  if (action === "closed") return "complete"
  if (action === "reopened") return "open"

  if (action === "labeled" && labelName === "status:in-progress") return "in_progress"
  if (action === "labeled" && labelName === "status:done") return "complete"
  if (action === "unlabeled" && labelName === "status:in-progress") return "open"
  if (action === "unlabeled" && labelName === "status:done") {
    return issueState === "open" ? "open" : "complete"
  }

  return null
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  const signature = request.headers.get("x-hub-signature-256")
  if (WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = request.headers.get("x-github-event")
  if (event !== "issues") {
    return NextResponse.json({ ok: true, skipped: true, reason: "not an issues event" })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const action: string = payload.action
  const issue = payload.issue
  const label = payload.label

  if (!issue?.html_url) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no issue URL" })
  }

  const newStatus = resolveStatus(action, label?.name, issue.state)
  if (!newStatus) {
    return NextResponse.json({ ok: true, skipped: true, reason: `action '${action}' not mapped` })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const issueUrl = issue.html_url as string

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("platform_development_reports")
    .select("id, status")
    .eq("github_issue_url", issueUrl)
    .maybeSingle()

  if (fetchError) {
    console.error("Supabase fetch error:", fetchError)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no matching report" })
  }

  // Loop prevention: skip if status already matches
  if (existing.status === newStatus) {
    return NextResponse.json({ ok: true, skipped: true, reason: "status already matches" })
  }

  const updateData: Record<string, any> = { status: newStatus }
  if (newStatus === "complete") {
    updateData.completed_at = new Date().toISOString()
  } else {
    updateData.completed_by = null
    updateData.completed_at = null
  }

  const { error: updateError } = await supabaseAdmin
    .from("platform_development_reports")
    .update(updateData)
    .eq("id", existing.id)

  if (updateError) {
    console.error("Supabase update error:", updateError)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }

  console.log(`Webhook: issue ${issueUrl} → status '${newStatus}' (report ${existing.id})`)

  return NextResponse.json({
    ok: true,
    reportId: existing.id,
    previousStatus: existing.status,
    newStatus,
  })
}
