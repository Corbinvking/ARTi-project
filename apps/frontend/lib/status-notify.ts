export type StatusNotifyPayload = {
  service: string
  campaignId: string
  status: string
  previousStatus?: string | null
  campaignName?: string | null
  actorEmail?: string | null
}

export type CampaignCreatedPayload = {
  service: string
  campaignId: string
  campaignName: string
  youtubeUrl?: string | null
  clientName?: string | null
  actorEmail?: string | null
}

export const notifyOpsStatusChange = async (payload: StatusNotifyPayload) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const url = baseUrl ? `${baseUrl}/api/status-notify` : "/api/status-notify"

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error("Failed to notify ops about status change:", error)
  }
}

export const notifyOpsCampaignCreated = async (payload: CampaignCreatedPayload) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const url = baseUrl ? `${baseUrl}/api/campaign-created-notify` : "/api/campaign-created-notify"

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        eventType: 'campaign_created',
      }),
    })
  } catch (error) {
    console.error("Failed to notify ops about campaign creation:", error)
  }
}

export type ScraperNotifyPayload = {
  campaignId: string
  campaignName: string
  youtubeUrl: string
  videoId?: string | null
  actorEmail?: string | null
}

export const notifyScraperCommentsNeeded = async (payload: ScraperNotifyPayload) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const url = baseUrl ? `${baseUrl}/api/scraper-notify/comments-needed` : "/api/scraper-notify/comments-needed"

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch (error) {
    console.error("Failed to notify scraper about comments needed:", error)
    return false
  }
}
