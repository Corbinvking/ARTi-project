export type SlackPlatform = 'soundcloud' | 'spotify' | 'instagram' | 'youtube'

export type SlackNotifyPayload = {
  platform: SlackPlatform
  event: string
  channel?: string
  data?: Record<string, any>
}

export const notifySlack = async (platform: SlackPlatform, event: string, data?: Record<string, any>) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const url = baseUrl ? `${baseUrl}/api/slack-notify` : "/api/slack-notify"

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, event, data } satisfies SlackNotifyPayload),
    })
  } catch (error) {
    console.error("Failed to send Slack notification:", error)
  }
}

export const testSlackConnection = async (platform: SlackPlatform): Promise<{ ok: boolean; message?: string }> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const url = baseUrl ? `${baseUrl}/api/slack-notify/test` : "/api/slack-notify/test"

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    })
    return await response.json()
  } catch (error) {
    console.error("Failed to test Slack connection:", error)
    return { ok: false, message: "Failed to reach the server" }
  }
}
