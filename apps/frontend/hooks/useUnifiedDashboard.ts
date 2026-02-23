"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/auth"

export interface UnifiedDashboardData {
  revenue: {
    activeRevenue: number
    previousMonthRevenue: number
    momChange: number
    activeCampaignCount: number
  }
  risk: {
    total: number
    missingAssets: number
    behindSchedule: number
    apiFailures: number
    reportsOverdue: number
  }
  opsLoad: {
    totalPendingTasks: number
    avgTaskAgeDays: number
    bottleneckPlatform: string
  }
  funnel: {
    intake: number
    setup: number
    active: number
    reporting: number
    completed: number
  }
  deadlines: {
    reportsDue: number
    campaignsEnding: number
    finalReviews: number
  }
  endingSoon: Array<{
    id: string
    artist: string
    service: string
    endDate: string
    performanceStatus: "on_track" | "overperforming" | "underperforming"
    daysLeft: number
  }>
  profitability: Array<{
    id: string
    name: string
    revenue: number
    vendorCost: number
    adSpend: number
    margin: number
    level: "healthy" | "warning" | "critical"
  }>
  lowMarginCount: number
}

const ACTIVE_STATUSES = ["active", "in_progress", "running"]
const normalize = (s: string | null) => (s || "").toLowerCase().trim()
const parseNum = (v: any) => parseFloat(String(v)) || 0

export const useUnifiedDashboard = () => {
  return useQuery({
    queryKey: ["unified-dashboard"],
    queryFn: async (): Promise<UnifiedDashboardData> => {
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const today = now.toISOString().split("T")[0]

      const [
        campaignGroupsRes,
        spotifyCampaignsRes,
        playlistsRes,
        vendorsRes,
        allocationsRes,
        invoicesRes,
        igCampaignsRes,
        ytCampaignsRes,
        scSubmissionsRes,
        submissionsRes,
      ] = await Promise.all([
        supabase.from("campaign_groups").select("*"),
        supabase.from("spotify_campaigns").select("*"),
        supabase.from("campaign_playlists").select("*"),
        supabase.from("vendors").select("*"),
        supabase.from("campaign_allocations_performance").select("*"),
        supabase.from("campaign_invoices").select("*"),
        supabase.from("instagram_campaigns").select("*"),
        supabase.from("youtube_campaigns").select("*"),
        supabase.from("soundcloud_submissions").select("*"),
        supabase.from("campaign_submissions").select("*"),
      ])

      const campaignGroups: any[] = campaignGroupsRes.data || []
      const songs: any[] = spotifyCampaignsRes.data || []
      const playlists: any[] = playlistsRes.data || []
      const vendors: any[] = vendorsRes.data || []
      const allocations: any[] = allocationsRes.data || []
      const invoices: any[] = invoicesRes.data || []
      const igCampaigns: any[] = igCampaignsRes.data || []
      const ytCampaigns: any[] = ytCampaignsRes.data || []
      const scSubmissions: any[] = scSubmissionsRes.data || []
      const submissions: any[] = submissionsRes.data || []

      // --- REVENUE ---
      // campaign_groups.total_budget, instagram_campaigns.budget,
      // youtube_campaigns.sale_price, soundcloud_submissions.sales_price
      const allCampaigns = [
        ...campaignGroups.map(c => ({
          ...c,
          _budget: parseNum(c.total_budget),
          _service: "Spotify",
          _name: c.name || c.artist_name,
        })),
        ...igCampaigns.map(c => ({
          ...c,
          _budget: parseNum(c.budget),
          _service: "Instagram",
          _name: c.name || c.brand_name,
        })),
        ...ytCampaigns.map(c => ({
          ...c,
          _budget: parseNum(c.sale_price),
          _service: "YouTube",
          _name: c.campaign_name,
        })),
        ...scSubmissions.map(c => ({
          ...c,
          _budget: parseNum(c.sales_price),
          _service: "SoundCloud",
          _name: c.track_name || c.artist_name,
        })),
      ]

      const activeCampaigns = allCampaigns.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))

      const activeRevenue = activeCampaigns.reduce((sum, c) => sum + c._budget, 0)

      const previousMonthCampaigns = allCampaigns.filter(c => {
        const created = new Date(c.created_at || c.start_date || c.submitted_at)
        return !isNaN(created.getTime()) && created >= previousMonthStart && created <= previousMonthEnd
      })
      const previousMonthRevenue = previousMonthCampaigns.reduce((sum, c) => sum + c._budget, 0)
      const momChange = previousMonthRevenue > 0
        ? ((activeRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0

      // --- RISK: Behind Schedule ---
      // spotify_campaigns has `goal` (TEXT), `start_date` (TEXT) — no duration_days
      // Use campaign_group's end_date for duration when available
      const vendorCostMap = new Map<string, number>()
      vendors.forEach(v => {
        if (parseNum(v.cost_per_1k_streams) > 0) vendorCostMap.set(v.id, parseNum(v.cost_per_1k_streams))
      })

      let behindSchedule = 0

      // Check spotify_campaigns pacing via their campaign_group dates
      const groupMap = new Map(campaignGroups.map(g => [g.id, g]))
      const activeSpotifySongs = songs.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))
      for (const song of activeSpotifySongs) {
        const group = song.campaign_group_id ? groupMap.get(song.campaign_group_id) : null
        const goal = parseNum(song.goal) || (group ? parseNum(group.total_goal) : 0)
        const startStr = song.start_date || (group ? group.start_date : null)
        const endStr = group ? group.end_date : null
        if (!startStr || !goal) continue
        const start = new Date(startStr)
        const end = endStr ? new Date(endStr) : null
        if (isNaN(start.getTime())) continue
        const durationDays = end && !isNaN(end.getTime())
          ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
          : 30
        const elapsedDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
        const expectedStreams = (goal / durationDays) * Math.min(elapsedDays, durationDays)
        // campaign_playlists.campaign_id is INTEGER matching spotify_campaigns.id (SERIAL)
        const playlistStreams = playlists
          .filter((p: any) => p.campaign_id === song.id)
          .reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0)
        const allocStreams = allocations
          .filter(a => a.campaign_id === song.id)
          .reduce((sum, a) => sum + (parseNum(a.actual_streams)), 0)
        if (expectedStreams > 0 && Math.max(playlistStreams, allocStreams) / expectedStreams < 0.8) {
          behindSchedule++
        }
      }

      // YouTube behind-pace check
      for (const yt of ytCampaigns.filter(c => ACTIVE_STATUSES.includes(normalize(c.status)))) {
        const goal = parseNum(yt.goal_views)
        const daily = parseNum(yt.desired_daily)
        if (!goal || !daily || !yt.start_date) continue
        const start = new Date(yt.start_date)
        if (isNaN(start.getTime())) continue
        const elapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
        const expected = daily * elapsed
        const actual = parseNum(yt.current_views)
        if (expected > 0 && actual / expected < 0.8) behindSchedule++
      }

      // --- RISK: Missing Assets ---
      const missingAssets = submissions.filter(s =>
        normalize(s.status) === "pending" && (!s.track_url || !s.music_genres?.length)
      ).length
        + igCampaigns.filter(c =>
          ACTIVE_STATUSES.includes(normalize(c.status)) && !c.name && !c.brand_name
        ).length
        + ytCampaigns.filter(c =>
          ACTIVE_STATUSES.includes(normalize(c.status)) && !c.youtube_url
        ).length

      // --- RISK: Reports Overdue ---
      const reportsOverdue = campaignGroups.filter(c => {
        const st = normalize(c.status)
        if (st !== "reporting" && st !== "complete" && st !== "completed") return false
        const endDate = c.end_date ? new Date(c.end_date) : null
        return endDate && !isNaN(endDate.getTime()) && endDate < now && normalize(c.invoice_status) !== "invoiced"
      }).length
        + igCampaigns.filter(c => {
          const st = normalize(c.status)
          if (!["complete", "completed", "done"].includes(st)) return false
          const endDate = c.posting_window_end ? new Date(c.posting_window_end) : null
          return endDate && !isNaN(endDate.getTime()) && endDate < now && !c.final_report_sent_at
        }).length

      const apiFailures = 0

      // --- OPS LOAD ---
      const pendingByPlatform: Record<string, number> = {
        Spotify: submissions.filter(s => normalize(s.status) === "pending").length
          + songs.filter(s => normalize(s.status) === "pending" || normalize(s.status) === "draft").length,
        Instagram: igCampaigns.filter(c =>
          normalize(c.status) === "pending" || normalize(c.status) === "draft"
          || (ACTIVE_STATUSES.includes(normalize(c.status)) && !c.page_selection_approved)
        ).length,
        YouTube: ytCampaigns.filter(c =>
          normalize(c.status) === "pending" || normalize(c.status) === "ready"
        ).length,
        SoundCloud: scSubmissions.filter(c =>
          normalize(c.status) === "new" || normalize(c.status) === "pending"
        ).length,
      }
      const totalPendingTasks = Object.values(pendingByPlatform).reduce((a, b) => a + b, 0)
      const bottleneckPlatform = Object.entries(pendingByPlatform).sort((a, b) => b[1] - a[1])[0]?.[0] || "None"

      const allPendingDates = [
        ...submissions.filter(s => normalize(s.status) === "pending").map(s => s.created_at),
        ...igCampaigns.filter(c => normalize(c.status) === "pending" || normalize(c.status) === "draft").map(c => c.created_at),
        ...ytCampaigns.filter(c => normalize(c.status) === "pending").map(c => c.created_at),
        ...scSubmissions.filter(c => normalize(c.status) === "new" || normalize(c.status) === "pending").map(c => c.created_at || c.submitted_at),
      ].filter(Boolean)
      const avgTaskAgeDays = allPendingDates.length > 0
        ? allPendingDates.reduce((sum, d) => {
            const date = new Date(d)
            return sum + (isNaN(date.getTime()) ? 0 : (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))
          }, 0) / allPendingDates.length
        : 0

      // --- FUNNEL ---
      const intake = submissions.filter(s => normalize(s.status) === "pending").length
        + scSubmissions.filter(c => normalize(c.status) === "new").length
      const setup = songs.filter(s => normalize(s.status) === "draft" || normalize(s.status) === "pending").length
        + ytCampaigns.filter(c => normalize(c.status) === "ready" || normalize(c.status) === "pending").length
        + igCampaigns.filter(c => normalize(c.status) === "pending" || normalize(c.status) === "draft").length
      const active = activeCampaigns.length
      const reporting = campaignGroups.filter(c => normalize(c.status) === "reporting").length
        + ytCampaigns.filter(c => normalize(c.status) === "reporting").length
      const completed = allCampaigns.filter(c => {
        const isDone = ["complete", "completed", "done", "finished"].includes(normalize(c.status))
        if (!isDone) return false
        const updated = c.updated_at || c.created_at || c.submitted_at
        return updated && new Date(updated) >= thirtyDaysAgo
      }).length

      // --- DEADLINES (next 7 days) ---
      // campaign_groups.end_date, youtube_campaigns.end_date,
      // instagram_campaigns.posting_window_end, soundcloud_submissions.support_date
      const getEndDate = (c: any): Date | null => {
        const raw = c.end_date || c.posting_window_end || null
        if (!raw) return null
        const d = new Date(raw)
        return isNaN(d.getTime()) ? null : d
      }

      const campaignsEndingIn7 = allCampaigns.filter(c => {
        const end = getEndDate(c)
        return end && end >= now && end <= sevenDaysFromNow
      })
      const reportsDue = campaignGroups.filter(c => {
        const end = c.end_date ? new Date(c.end_date) : null
        return end && !isNaN(end.getTime()) && end >= now && end <= sevenDaysFromNow
          && !["completed", "complete"].includes(normalize(c.status))
      }).length
        + igCampaigns.filter(c => {
          if (c.followup_report_date) {
            const d = new Date(c.followup_report_date)
            return !isNaN(d.getTime()) && d >= now && d <= sevenDaysFromNow && !c.followup_report_sent_at
          }
          return false
        }).length
      const finalReviews = campaignsEndingIn7.filter(c =>
        ACTIVE_STATUSES.includes(normalize(c.status))
      ).length

      // --- ENDING SOON ---
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const endingSoon = allCampaigns
        .filter(c => {
          const end = getEndDate(c)
          return end && end >= now && end <= thirtyDaysFromNow && ACTIVE_STATUSES.includes(normalize(c.status))
        })
        .map(c => {
          const endDate = getEndDate(c)!
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

          let performanceStatus: "on_track" | "overperforming" | "underperforming" = "on_track"
          if (c._service === "Spotify") {
            const group = c.campaign_group_id ? groupMap.get(c.campaign_group_id) : c
            const goal = parseNum(group?.total_goal || c.goal)
            const startStr = c.start_date || group?.start_date
            if (goal && startStr) {
              const start = new Date(startStr)
              if (!isNaN(start.getTime())) {
                const durationDays = Math.max(1, Math.ceil((endDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
                const elapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
                const expected = (goal / durationDays) * Math.min(elapsed, durationDays)
                const actual = playlists
                  .filter((p: any) => p.campaign_id === c.id)
                  .reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0)
                if (actual >= expected * 1.2) performanceStatus = "overperforming"
                else if (actual < expected * 0.8) performanceStatus = "underperforming"
              }
            }
          } else if (c._service === "YouTube") {
            const goal = parseNum(c.goal_views)
            const actual = parseNum(c.current_views)
            if (goal > 0) {
              const ratio = actual / goal
              if (ratio >= 0.9) performanceStatus = "overperforming"
              else if (ratio < 0.5) performanceStatus = "underperforming"
            }
          }

          return {
            id: String(c.id),
            artist: c._name || c.artist_name || c.track_name || "Unknown",
            service: c._service,
            endDate: endDate.toISOString().split("T")[0],
            performanceStatus,
            daysLeft,
          }
        })
        .sort((a, b) => a.daysLeft - b.daysLeft)

      // --- PROFITABILITY ---
      // Based on campaign_groups (Spotify) with vendor cost from campaign_playlists
      // Also include instagram ad_spend from ig campaigns
      const profitability: UnifiedDashboardData["profitability"] = []

      // Spotify campaign_groups profitability
      for (const group of campaignGroups) {
        if (!ACTIVE_STATUSES.includes(normalize(group.status))) continue
        const revenue = parseNum(group.total_budget)
        if (revenue <= 0) continue
        const groupSongs = songs.filter(s => s.campaign_group_id === group.id)
        const groupSongIds = new Set(groupSongs.map(s => s.id))
        const vendorCost = playlists
          .filter((p: any) => groupSongIds.has(p.campaign_id) && p.vendor_id && !p.is_algorithmic)
          .reduce((sum: number, p: any) => {
            const rate = parseNum(p.cost_per_1k_override) || vendorCostMap.get(p.vendor_id) || 0
            return sum + ((p.streams_12m || 0) / 1000) * rate
          }, 0)
        const margin = ((revenue - vendorCost) / revenue) * 100
        let level: "healthy" | "warning" | "critical" = "healthy"
        if (margin < 20) level = "critical"
        else if (margin < 30) level = "warning"
        if (level !== "healthy") {
          profitability.push({
            id: group.id,
            name: group.name || group.artist_name || "Unknown",
            revenue,
            vendorCost,
            adSpend: 0,
            margin,
            level,
          })
        }
      }

      // YouTube profitability
      for (const yt of ytCampaigns) {
        if (!ACTIVE_STATUSES.includes(normalize(yt.status))) continue
        const revenue = parseNum(yt.sale_price)
        if (revenue <= 0) continue
        const vendorCost = parseNum(yt.custom_vendor_cost) || parseNum(yt.calculated_vendor_payment)
        const margin = ((revenue - vendorCost) / revenue) * 100
        let level: "healthy" | "warning" | "critical" = "healthy"
        if (margin < 20) level = "critical"
        else if (margin < 30) level = "warning"
        if (level !== "healthy") {
          profitability.push({
            id: yt.id,
            name: yt.campaign_name || "YouTube Campaign",
            revenue,
            vendorCost,
            adSpend: 0,
            margin,
            level,
          })
        }
      }

      profitability.sort((a, b) => a.margin - b.margin)
      const lowMarginCount = profitability.filter(p => p.level === "critical").length

      return {
        revenue: {
          activeRevenue,
          previousMonthRevenue,
          momChange,
          activeCampaignCount: activeCampaigns.length,
        },
        risk: {
          total: missingAssets + behindSchedule + apiFailures + reportsOverdue,
          missingAssets,
          behindSchedule,
          apiFailures,
          reportsOverdue,
        },
        opsLoad: {
          totalPendingTasks,
          avgTaskAgeDays: Math.round(avgTaskAgeDays * 10) / 10,
          bottleneckPlatform,
        },
        funnel: { intake, setup, active, reporting, completed },
        deadlines: {
          reportsDue,
          campaignsEnding: campaignsEndingIn7.length,
          finalReviews,
        },
        endingSoon,
        profitability,
        lowMarginCount,
      }
    },
    staleTime: 3 * 60 * 1000,
  })
}
