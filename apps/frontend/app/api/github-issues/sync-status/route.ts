import { NextResponse } from "next/server"

const REPO_OWNER = "Corbinvking"
const REPO_NAME = "ARTi-project"
const GITHUB_API = "https://api.github.com"

type SyncPayload = {
  issueUrl: string
  status: "open" | "in_progress" | "complete"
}

function extractIssueNumber(url: string): number | null {
  const match = url.match(/\/issues\/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

async function githubFetch(path: string, token: string, options: RequestInit = {}) {
  return fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  })
}

async function addLabel(issueNumber: number, label: string, token: string) {
  await githubFetch(
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/labels`,
    token,
    { method: "POST", body: JSON.stringify({ labels: [label] }) }
  )
}

async function removeLabel(issueNumber: number, label: string, token: string) {
  await githubFetch(
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
    token,
    { method: "DELETE" }
  )
}

async function setIssueState(issueNumber: number, state: "open" | "closed", token: string) {
  await githubFetch(
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`,
    token,
    { method: "PATCH", body: JSON.stringify({ state }) }
  )
}

export async function POST(request: Request) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "GITHUB_TOKEN is not configured" },
      { status: 500 }
    )
  }

  let payload: SyncPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { issueUrl, status } = payload
  if (!issueUrl || !status) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields: issueUrl, status" },
      { status: 400 }
    )
  }

  const issueNumber = extractIssueNumber(issueUrl)
  if (!issueNumber) {
    return NextResponse.json(
      { ok: false, message: "Could not extract issue number from URL" },
      { status: 400 }
    )
  }

  try {
    const statusLabelsToRemove = ["status:triage", "status:in-progress", "status:done", "status:confirmed"]

    // Remove all existing status labels (fire-and-forget, ignore 404s for missing labels)
    await Promise.allSettled(
      statusLabelsToRemove.map((label) => removeLabel(issueNumber, label, token))
    )

    switch (status) {
      case "in_progress":
        await addLabel(issueNumber, "status:in-progress", token)
        await setIssueState(issueNumber, "open", token)
        break

      case "complete":
        await addLabel(issueNumber, "status:done", token)
        await setIssueState(issueNumber, "closed", token)
        break

      case "open":
        await addLabel(issueNumber, "status:triage", token)
        await setIssueState(issueNumber, "open", token)
        break
    }

    console.log(`Synced issue #${issueNumber} → GitHub status '${status}'`)

    return NextResponse.json({ ok: true, issueNumber, status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`Failed to sync issue #${issueNumber}:`, error)
    return NextResponse.json(
      { ok: false, message: `GitHub sync failed: ${message}` },
      { status: 502 }
    )
  }
}
