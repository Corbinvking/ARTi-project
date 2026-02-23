"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/auth"

export interface PlatformHealth {
  spotify: {
    activeCampaigns: number
    avgPacePercent: number
    behindPace: number
    apiConnected: boolean
  }
  instagram: {
    scheduledToday: number
    pendingApproval: number
    activeCampaigns: number
  }
  youtube: {
    monitoringPhase: number
    ratioAlerts: number
    apiIssues: number
  }
  soundcloud: {
    scheduledToday: number
    activeCampaigns: number
    missedActions: number
  }
}

const ACTIVE_STATUSES = ["active", "in_progress", "running"]
const normalize = (s: string | null) => (s || "").toLowerCase().trim()
const parseNum = (v: any) => parseFloat(String(v)) || 0

export const usePlatformDeliveryHealth = () => {
  return useQuery({
    queryKey: ["platform-delivery-health"],
    queryFn: async (): Promise<PlatformHealth> => {
      const now = new Date()
      const today = now.toISOString().split("T")[0]

      const [
        spotifyCampaignsRes,
        campaignGroupsRes,
        playlistsRes,
        allocationsRes,
        igCampaignsRes,
        ytCampaignsRes,
        scSubmissionsRes,
      ] = await Promise.all([
        supabase.from("spotify_campaigns").select("id, status, goal, start_date, campaign_group_id"),
        supabase.from("campaign_groups").select("id, total_goal, start_date, end_date, status"),
        supabase.from("campaign_playlists").select("campaign_id, streams_12m, vendor_id, updated_at, created_at"),
        supabase.from("campaign_allocations_performance").select("campaign_id, actual_streams"),
        supabase.from("instagram_campaigns").select("id, status, posting_window_start, posting_window_end, page_selection_approved"),
        supabase.from("youtube_campaigns").select("id, status, goal_views, desired_daily, current_views, start_date, ratio_fixer_status, views_stalled, last_api_poll_at"),
        supabase.from("soundcloud_submissions").select("id, status, support_date"),
      ])

      const songs: any[] = spotifyCampaignsRes.data || []
      const groups: any[] = campaignGroupsRes.data || []
      const playlists: any[] = playlistsRes.data || []
      const allocations: any[] = allocationsRes.data || []
      const igCampaigns: any[] = igCampaignsRes.data || []
      const ytCampaigns: any[] = ytCampaignsRes.data || []
      const scSubmissions: any[] = scSubmissionsRes.data || []

      const groupMap = new Map(groups.map(g => [g.id, g]))

      // --- SPOTIFY ---
      const activeSpotify = songs.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))
      let behindPace = 0
      let totalPacePercent = 0
      let measuredCount = 0

      for (const song of activeSpotify) {
        const group = song.campaign_group_id ? groupMap.get(song.campaign_group_id) : null
        const goal = parseNum(song.goal) || (group ? parseNum(group.total_goal) : 0)
        const startStr = song.start_date || (group ? group.start_date : null)
        const endStr = group ? group.end_date : null
        if (!startStr || !goal) {
          totalPacePercent += 100
          measuredCount++
          continue
        }
        const start = new Date(startStr)
        if (isNaN(start.getTime())) {
          totalPacePercent += 100
          measuredCount++
          continue
        }
        const end = endStr ? new Date(endStr) : null
        const durationDays = end && !isNaN(end.getTime())
          ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
          : 30
        const elapsedDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
        const expectedStreams = (goal / durationDays) * Math.min(elapsedDays, durationDays)

        // campaign_playlists.campaign_id is INTEGER matching spotify_campaigns.id
        const playlistStreams = playlists
          .filter((p: any) => p.campaign_id === song.id)
          .reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0)
        const allocStreams = allocations
          .filter(a => a.campaign_id === song.id)
          .reduce((sum, a) => sum + parseNum(a.actual_streams), 0)
        const bestStreams = Math.max(playlistStreams, allocStreams)
        const pacePercent = expectedStreams > 0 ? (bestStreams / expectedStreams) * 100 : 100
        totalPacePercent += Math.min(pacePercent, 100)
        measuredCount++
        if (pacePercent < 80) behindPace++
      }

      const avgPacePercent = measuredCount > 0 ? Math.round(totalPacePercent / measuredCount) : 100

      const hasRecentPlaylistData = playlists.some(p => {
        const date = p.updated_at || p.created_at
        return date && new Date(date) > new Date(now.getTime() - 48 * 60 * 60 * 1000)
      })

      // --- INSTAGRAM ---
      // Uses posting_window_start/posting_window_end, not start_date
      const activeIG = igCampaigns.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))
      const pendingApproval = igCampaigns.filter(c =>
        normalize(c.status) === "pending" || normalize(c.status) === "draft"
        || (ACTIVE_STATUSES.includes(normalize(c.status)) && !c.page_selection_approved)
      ).length
      const scheduledTodayIG = igCampaigns.filter(c => {
        const windowStart = c.posting_window_start
        const windowEnd = c.posting_window_end
        if (!windowStart || !windowEnd) return false
        return windowStart <= today && windowEnd >= today && ACTIVE_STATUSES.includes(normalize(c.status))
      }).length

      // --- YOUTUBE ---
      const activeYT = ytCampaigns.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))
      const monitoringPhase = activeYT.length

      // Ratio alerts: campaigns where views_stalled is true or ratio_fixer is active
      const ratioAlerts = ytCampaigns.filter(c => {
        if (!ACTIVE_STATUSES.includes(normalize(c.status))) return false
        if (c.views_stalled) return true
        if (c.ratio_fixer_status && ["active", "running"].includes(normalize(c.ratio_fixer_status))) return true
        // Also flag if current_views is significantly behind expected
        const goal = parseNum(c.goal_views)
        const daily = parseNum(c.desired_daily)
        const actual = parseNum(c.current_views)
        if (!goal || !daily || !c.start_date) return false
        const start = new Date(c.start_date)
        if (isNaN(start.getTime())) return false
        const elapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
        const expected = daily * elapsed
        return expected > 0 && actual / expected < 0.5
      }).length

      // API issues: YouTube campaigns with stale polling data
      const apiIssues = ytCampaigns.filter(c => {
        if (!ACTIVE_STATUSES.includes(normalize(c.status))) return false
        if (!c.last_api_poll_at) return false
        const lastPoll = new Date(c.last_api_poll_at)
        return !isNaN(lastPoll.getTime()) && (now.getTime() - lastPoll.getTime()) > 48 * 60 * 60 * 1000
      }).length

      // --- SOUNDCLOUD ---
      const activeSC = scSubmissions.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))
      const scheduledTodaySC = scSubmissions.filter(c => {
        const support = c.support_date
        return support === today
      }).length
      const missedActions = scSubmissions.filter(c => {
        if (!c.support_date) return false
        return c.support_date < today && normalize(c.status) === "pending"
      }).length

      return {
        spotify: {
          activeCampaigns: activeSpotify.length,
          avgPacePercent,
          behindPace,
          apiConnected: hasRecentPlaylistData || playlists.length === 0,
        },
        instagram: {
          scheduledToday: scheduledTodayIG,
          pendingApproval,
          activeCampaigns: activeIG.length,
        },
        youtube: {
          monitoringPhase,
          ratioAlerts,
          apiIssues,
        },
        soundcloud: {
          scheduledToday: scheduledTodaySC,
          activeCampaigns: activeSC.length,
          missedActions,
        },
      }
    },
    staleTime: 3 * 60 * 1000,
  })
}
