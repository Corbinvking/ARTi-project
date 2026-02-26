import { NextResponse } from "next/server"

const REPO_OWNER = "Corbinvking"
const REPO_NAME = "ARTi-project"
const GITHUB_API = "https://api.github.com"

const PROJECT_MAP: Record<string, string> = {
  spotify: "PVT_kwHOCLGpZM4BQRpJ",
  instagram: "PVT_kwHOCLGpZM4BQRpR",
  youtube: "PVT_kwHOCLGpZM4BQRpO",
  soundcloud: "PVT_kwHOCLGpZM4BQRpU",
  dashboard: "PVT_kwHOCLGpZM4BQRpV",
  operator: "PVT_kwHOCLGpZM4BQRpV",
  admin: "PVT_kwHOCLGpZM4BQRpV",
  shared: "PVT_kwHOCLGpZM4BQRpV",
}

type ReportPayload = {
  type: "bug" | "feature_request"
  title: string
  description: string
  priority: "low" | "medium" | "high"
  submittedByName: string
  elementData?: {
    selector: string
    tagName: string
    id: string | null
    classes: string[]
    textContent: string
    pageUrl: string
    boundingRect: { top: number; left: number; width: number; height: number }
    timestamp: string
  } | null
  supabaseReportId?: string
}

function detectAppDomain(pageUrl?: string): string {
  if (!pageUrl) return "shared"
  const pathMatch = pageUrl.match(
    /\/(spotify|instagram|youtube|soundcloud|dashboard|operator|admin)(\/|$)/i
  )
  if (pathMatch) return pathMatch[1].toLowerCase()
  return "shared"
}

function mapPriority(priority: string): string {
  const map: Record<string, string> = {
    low: "priority:low",
    medium: "priority:medium",
    high: "priority:high",
  }
  return map[priority] || "priority:medium"
}

function mapType(type: string): string {
  return type === "bug" ? "type:bug" : "type:feature"
}

function buildIssueBody(payload: ReportPayload): string {
  const sections: string[] = []
  const app = detectAppDomain(payload.elementData?.pageUrl)

  const appLabels: Record<string, string> = {
    spotify: "Spotify (playlist campaigns, vendors, stream strategist)",
    instagram: "Instagram (creator campaigns, seedstorm builder)",
    youtube: "YouTube (video campaigns, vidi health flow)",
    soundcloud: "SoundCloud (repost network, member portal)",
    dashboard: "Dashboard (cross-platform overview)",
    operator: "Operator (internal ops tools)",
    admin: "Admin (user management, settings)",
    shared: "Shared (components, hooks, utilities)",
  }

  sections.push(`### App Module\n\n${appLabels[app] || appLabels.shared}`)
  sections.push(
    `### ${payload.type === "bug" ? "Bug Description" : "Feature Description"}\n\n${payload.description || "No description provided."}`
  )

  if (payload.type === "bug") {
    const severityMap: Record<string, string> = {
      high: "High - Major feature broken",
      medium: "Medium - Feature degraded",
      low: "Low - Minor cosmetic issue",
    }
    sections.push(
      `### Severity\n\n${severityMap[payload.priority] || severityMap.medium}`
    )
  } else {
    const complexityMap: Record<string, string> = {
      high: "High - Complex, architectural impact (> 4 hours)",
      medium: "Medium - Moderate scope, multiple files (1-4 hours)",
      low: "Low - Simple, isolated change (< 1 hour)",
    }
    sections.push(
      `### Estimated Complexity\n\n${complexityMap[payload.priority] || complexityMap.medium}`
    )
  }

  if (payload.elementData) {
    const el = payload.elementData
    const rows = [
      `| **Page URL** | ${el.pageUrl} |`,
      `| **CSS Selector** | \`${el.selector}\` |`,
      `| **Tag** | \`${el.tagName.toLowerCase()}\` |`,
      el.id ? `| **ID** | \`${el.id}\` |` : null,
      el.classes.length > 0
        ? `| **Classes** | \`${el.classes.join(", ")}\` |`
        : null,
      el.textContent
        ? `| **Text** | "${el.textContent.slice(0, 200)}" |`
        : null,
      `| **Position** | top=${el.boundingRect.top}px, left=${el.boundingRect.left}px, ${el.boundingRect.width}x${el.boundingRect.height} |`,
      `| **Captured** | ${el.timestamp} |`,
    ].filter(Boolean)

    sections.push(
      `### Element Context\n\n| Field | Value |\n|-------|-------|\n${rows.join("\n")}`
    )
  }

  sections.push(`### Submitted By\n\n${payload.submittedByName}`)

  if (payload.supabaseReportId) {
    sections.push(
      `### Internal Reference\n\nSupabase report ID: \`${payload.supabaseReportId}\``
    )
  }

  sections.push(`### Agent Assignable?\n\nNeeds Triage - Not sure yet`)

  return sections.join("\n\n---\n\n")
}

export async function POST(request: Request) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "GITHUB_TOKEN is not configured" },
      { status: 500 }
    )
  }

  let payload: ReportPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  if (!payload.title || !payload.type) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields: title, type" },
      { status: 400 }
    )
  }

  const app = detectAppDomain(payload.elementData?.pageUrl)
  const labels = [
    `app:${app}`,
    mapType(payload.type),
    mapPriority(payload.priority),
    "status:triage",
  ]
  const titlePrefix = payload.type === "bug" ? "[Bug]" : "[Feature]"
  const issueTitle = `${titlePrefix} ${payload.title}`
  const issueBody = buildIssueBody(payload)

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ title: issueTitle, body: issueBody, labels }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`GitHub API error: ${response.status} ${errorText}`)
      return NextResponse.json(
        { ok: false, message: `GitHub API error: ${response.status}` },
        { status: 502 }
      )
    }

    const issue = (await response.json()) as {
      number: number
      html_url: string
      node_id: string
    }
    console.log(`Created GitHub issue #${issue.number}: ${issue.html_url}`)

    const projectId = PROJECT_MAP[app]
    if (projectId) {
      try {
        const gqlResponse = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `mutation($projectId: ID!, $contentId: ID!) {
              addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
                item { id }
              }
            }`,
            variables: { projectId, contentId: issue.node_id },
          }),
        })
        const gqlData = await gqlResponse.json()
        if (gqlData.errors) {
          console.error("GraphQL project routing error:", gqlData.errors)
        } else {
          console.log(`Routed issue #${issue.number} to project ${projectId}`)
        }
      } catch (projError) {
        console.error("Failed to route issue to project:", projError)
      }
    }

    return NextResponse.json(
      { ok: true, issueNumber: issue.number, issueUrl: issue.html_url },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error"
    console.error("Failed to create GitHub issue:", error)
    return NextResponse.json(
      { ok: false, message: `Failed to create GitHub issue: ${message}` },
      { status: 502 }
    )
  }
}
