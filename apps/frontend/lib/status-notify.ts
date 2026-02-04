export type StatusNotifyPayload = {
  service: string
  campaignId: string
  status: string
  previousStatus?: string | null
  campaignName?: string | null
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
