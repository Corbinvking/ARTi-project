"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/auth"

export type AlertType = "invoice_overdue" | "underperforming" | "missing_assets" | "report_overdue" | "api_disconnected"
export type AlertSeverity = "critical" | "warning"

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  service: string
  campaignId?: string
  timestamp: string
}

const ACTIVE_STATUSES = ["active", "in_progress", "running"]
const normalize = (s: string | null) => (s || "").toLowerCase().trim()
const parseNum = (v: any) => parseFloat(String(v)) || 0

export const useAlertsFeed = () => {
  return useQuery({
    queryKey: ["alerts-feed"],
    queryFn: async (): Promise<Alert[]> => {
      const now = new Date()
      const today = now.toISOString().split("T")[0]

      const [
        invoicesRes,
        spotifyCampaignsRes,
        campaignGroupsRes,
        playlistsRes,
        allocationsRes,
        submissionsRes,
        ytCampaignsRes,
        igCampaignsRes,
      ] = await Promise.all([
        supabase.from("campaign_invoices")
          .select("id, amount, status, due_date, client_name, invoice_number"),
        supabase.from("spotify_campaigns")
          .select("id, campaign, goal, start_date, status, campaign_group_id, artist_name, track_name"),
        supabase.from("campaign_groups")
          .select("id, name, artist_name, status, end_date, start_date, total_goal, invoice_status"),
        supabase.from("campaign_playlists")
          .select("campaign_id, streams_12m"),
        supabase.from("campaign_allocations_performance")
          .select("campaign_id, actual_streams"),
        supabase.from("campaign_submissions")
          .select("id, campaign_name, status, track_url, music_genres, created_at"),
        supabase.from("youtube_campaigns")
          .select("id, campaign_name, status, youtube_url, goal_views, desired_daily, current_views, start_date, views_stalled"),
        supabase.from("instagram_campaigns")
          .select("id, name, brand_name, status, page_selection_approved, posting_window_end, final_report_sent_at"),
      ])

      const alerts: Alert[] = []

      // --- Invoice overdue alerts ---
      const invoices: any[] = invoicesRes.data || []
      for (const inv of invoices) {
        if (normalize(inv.status) === "paid") continue
        if (!inv.due_date || inv.due_date >= today) continue
        const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (24 * 60 * 60 * 1000))
        alerts.push({
          id: `inv-${inv.id}`,
          type: "invoice_overdue",
          severity: daysOverdue > 14 ? "critical" : "warning",
          title: `Invoice #${inv.invoice_number || "N/A"} overdue`,
          description: `$${parseNum(inv.amount).toLocaleString()} from ${inv.client_name || "Unknown"} — ${daysOverdue} days overdue`,
          service: "Billing",
          timestamp: inv.due_date,
        })
      }

      // --- Spotify underperforming alerts ---
      const songs: any[] = spotifyCampaignsRes.data || []
      const groups: any[] = campaignGroupsRes.data || []
      const playlists: any[] = playlistsRes.data || []
      const allocations: any[] = allocationsRes.data || []
      const groupMap = new Map(groups.map(g => [g.id, g]))

      for (const song of songs.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))) {
        const group = song.campaign_group_id ? groupMap.get(song.campaign_group_id) : null
        const goal = parseNum(song.goal) || (group ? parseNum(group.total_goal) : 0)
        const startStr = song.start_date || (group ? group.start_date : null)
        const endStr = group ? group.end_date : null
        if (!startStr || !goal) continue
        const start = new Date(startStr)
        if (isNaN(start.getTime())) continue
        const end = endStr ? new Date(endStr) : null
        const durationDays = end && !isNaN(end.getTime())
          ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
          : 30
        const elapsedDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
        const expectedStreams = (goal / durationDays) * Math.min(elapsedDays, durationDays)

        const playlistStreams = playlists
          .filter((p: any) => p.campaign_id === song.id)
          .reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0)
        const allocStreams = allocations
          .filter(a => a.campaign_id === song.id)
          .reduce((sum, a) => sum + parseNum(a.actual_streams), 0)
        const bestStreams = Math.max(playlistStreams, allocStreams)
        const pacePercent = expectedStreams > 0 ? (bestStreams / expectedStreams) * 100 : 100

        if (pacePercent < 80) {
          const name = song.campaign || song.track_name || song.artist_name
            || (group ? group.name || group.artist_name : null) || "Campaign"
          alerts.push({
            id: `pace-${song.id}`,
            type: "underperforming",
            severity: pacePercent < 50 ? "critical" : "warning",
            title: `${name} behind pace`,
            description: `${Math.round(pacePercent)}% of expected delivery — needs attention`,
            service: "Spotify",
            campaignId: String(song.id),
            timestamp: startStr,
          })
        }
      }

      // --- YouTube underperforming alerts ---
      const ytCampaigns: any[] = ytCampaignsRes.data || []
      for (const yt of ytCampaigns.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))) {
        if (yt.views_stalled) {
          alerts.push({
            id: `yt-stall-${yt.id}`,
            type: "underperforming",
            severity: "critical",
            title: `${yt.campaign_name || "YouTube Campaign"} views stalled`,
            description: "Views have stalled — needs intervention",
            service: "YouTube",
            campaignId: yt.id,
            timestamp: now.toISOString(),
          })
          continue
        }
        const goal = parseNum(yt.goal_views)
        const daily = parseNum(yt.desired_daily)
        const actual = parseNum(yt.current_views)
        if (!goal || !daily || !yt.start_date) continue
        const start = new Date(yt.start_date)
        if (isNaN(start.getTime())) continue
        const elapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
        const expected = daily * elapsed
        if (expected > 0 && actual / expected < 0.8) {
          const pacePercent = Math.round((actual / expected) * 100)
          alerts.push({
            id: `yt-pace-${yt.id}`,
            type: "underperforming",
            severity: pacePercent < 50 ? "critical" : "warning",
            title: `${yt.campaign_name || "YouTube Campaign"} behind pace`,
            description: `${pacePercent}% of expected views — ${actual.toLocaleString()} / ${expected.toLocaleString()} expected`,
            service: "YouTube",
            campaignId: yt.id,
            timestamp: yt.start_date,
          })
        }
      }

      // --- Missing assets alerts ---
      const submissions: any[] = submissionsRes.data || []
      for (const s of submissions.filter(s => normalize(s.status) === "pending")) {
        const missing: string[] = []
        if (!s.track_url) missing.push("track URL")
        if (!s.music_genres?.length) missing.push("genres")
        if (missing.length > 0) {
          alerts.push({
            id: `asset-${s.id}`,
            type: "missing_assets",
            severity: "warning",
            title: `${s.campaign_name || "Submission"} missing assets`,
            description: `Missing: ${missing.join(", ")}`,
            service: "Spotify",
            campaignId: s.id,
            timestamp: s.created_at,
          })
        }
      }

      for (const c of ytCampaigns.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)) && !c.youtube_url)) {
        alerts.push({
          id: `asset-yt-${c.id}`,
          type: "missing_assets",
          severity: "warning",
          title: `${c.campaign_name || "YouTube Campaign"} missing URL`,
          description: "No YouTube URL provided",
          service: "YouTube",
          campaignId: c.id,
          timestamp: now.toISOString(),
        })
      }

      // --- Report overdue alerts ---
      for (const c of groups) {
        const st = normalize(c.status)
        if (st !== "reporting" && st !== "complete" && st !== "completed") continue
        const endDate = c.end_date ? new Date(c.end_date) : null
        if (!endDate || isNaN(endDate.getTime()) || endDate >= now) continue
        if (normalize(c.invoice_status) === "invoiced") continue
        const daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000))
        alerts.push({
          id: `report-${c.id}`,
          type: "report_overdue",
          severity: daysOverdue > 7 ? "critical" : "warning",
          title: `${c.name || c.artist_name || "Campaign"} report overdue`,
          description: `Campaign ended ${daysOverdue} days ago — report not sent`,
          service: "Spotify",
          campaignId: c.id,
          timestamp: c.end_date,
        })
      }

      // Instagram report overdue: posting window ended but no final report
      const igCampaigns: any[] = igCampaignsRes.data || []
      for (const ig of igCampaigns) {
        const st = normalize(ig.status)
        if (!["complete", "completed", "done"].includes(st) && !ACTIVE_STATUSES.includes(st)) continue
        if (!ig.posting_window_end) continue
        const endDate = new Date(ig.posting_window_end)
        if (isNaN(endDate.getTime()) || endDate >= now) continue
        if (ig.final_report_sent_at) continue
        const daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000))
        if (daysOverdue >= 2) {
          alerts.push({
            id: `ig-report-${ig.id}`,
            type: "report_overdue",
            severity: daysOverdue > 7 ? "critical" : "warning",
            title: `${ig.name || ig.brand_name || "IG Campaign"} report overdue`,
            description: `Posting window ended ${daysOverdue} days ago — final report not sent`,
            service: "Instagram",
            campaignId: ig.id,
            timestamp: ig.posting_window_end,
          })
        }
      }

      return alerts.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })
    },
    staleTime: 2 * 60 * 1000,
  })
}
