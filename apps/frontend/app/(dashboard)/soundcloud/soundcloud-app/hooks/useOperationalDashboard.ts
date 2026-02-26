"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "../integrations/supabase/client"

export interface OperationalDashboardData {
  monthlyRevenue: {
    total: number
    previousMonth: number
    percentChange: number
  }
  activeCampaigns: {
    total: number
    paid: number
    free: number
  }
  activeMembers: {
    total: number
    connectedToPlanner: number
    notConnectedToPlanner: number
  }
  systemHealth: {
    successRate: number
    automationFailures24h: number
    activeWarnings: number
  }
  queueCapacity: number
  avgCampaignValue: number
  throughput: {
    tracksProcessed: number
    campaignsCompleted: number
    newEntries: number
  }
  alerts: Array<{
    id: string
    type: "failed_integration" | "disconnected_member" | "queue_threshold" | "stuck_campaign"
    severity: "critical" | "warning"
    title: string
    description: string
    count?: number
  }>
}

const ACTIVE_STATUSES = ["active", "in_progress", "running", "live"]
const PAID_TYPES = ["paid", "premium", "pro"]
const normalize = (s: string | null | undefined) => (s || "").toLowerCase().trim()
const parseNum = (v: any) => parseFloat(String(v)) || 0

export const useOperationalDashboard = () => {
  return useQuery({
    queryKey: ["sc-operational-dashboard"],
    queryFn: async (): Promise<OperationalDashboardData> => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const stuckThresholdDays = 7

      const [
        scCampaignsRes,
        campaignsRes,
        scSubmissionsRes,
        submissionsRes,
        membersRes,
        queuesRes,
        automationHealthRes,
        integrationStatusRes,
        schedulesRes,
      ] = await Promise.all([
        supabase.from("soundcloud_campaigns").select("*"),
        supabase.from("campaigns").select("*"),
        supabase.from("soundcloud_submissions").select("*"),
        supabase.from("submissions").select("*"),
        supabase.from("members").select("id, status, influence_planner_status"),
        supabase.from("queues").select("*").gte("date", todayStart.toISOString().split("T")[0]).order("date", { ascending: false }).limit(5),
        supabase.from("automation_health").select("*"),
        supabase.from("integration_status").select("*"),
        supabase.from("schedules").select("*").gte("created_at", todayStart.toISOString()),
      ])

      const scCampaigns: any[] = scCampaignsRes.data || []
      const campaigns: any[] = campaignsRes.data || []
      const scSubmissions: any[] = scSubmissionsRes.data || []
      const submissions: any[] = submissionsRes.data || []
      const members: any[] = membersRes.data || []
      const queues: any[] = queuesRes.data || []
      const automationHealth: any[] = automationHealthRes.data || []
      const integrationStatus: any[] = integrationStatusRes.data || []
      const todaySchedules: any[] = schedulesRes.data || []

      // --- MONTHLY REVENUE (paid campaigns only) ---
      const allPaidCampaigns = [
        ...scCampaigns.filter(c => parseNum(c.sales_price) > 0).map(c => ({
          ...c,
          _budget: parseNum(c.sales_price),
          _createdAt: c.created_at || c.start_date || c.submission_date,
        })),
        ...campaigns.filter(c => parseNum(c.price_usd) > 0).map(c => ({
          ...c,
          _budget: parseNum(c.price_usd),
          _createdAt: c.created_at || c.start_date || c.submission_date,
        })),
      ]

      const currentMonthRevenue = allPaidCampaigns
        .filter(c => {
          const created = new Date(c._createdAt)
          return !isNaN(created.getTime()) && created >= currentMonthStart && created <= now
        })
        .reduce((sum, c) => sum + c._budget, 0)

      const previousMonthRevenue = allPaidCampaigns
        .filter(c => {
          const created = new Date(c._createdAt)
          return !isNaN(created.getTime()) && created >= previousMonthStart && created <= previousMonthEnd
        })
        .reduce((sum, c) => sum + c._budget, 0)

      const percentChange = previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : currentMonthRevenue > 0 ? 100 : 0

      // --- ACTIVE CAMPAIGNS (Paid vs Free) ---
      const activePaidCampaigns = [
        ...scCampaigns.filter(c =>
          ACTIVE_STATUSES.includes(normalize(c.status)) && parseNum(c.sales_price) > 0
        ),
        ...campaigns.filter(c =>
          ACTIVE_STATUSES.includes(normalize(c.status)) && parseNum(c.price_usd) > 0
        ),
      ]

      const activeFreeCampaigns = [
        ...scSubmissions.filter(c =>
          ACTIVE_STATUSES.includes(normalize(c.status)) ||
          normalize(c.status) === "new" ||
          normalize(c.status) === "pending"
        ),
        ...submissions.filter(c =>
          ACTIVE_STATUSES.includes(normalize(c.status)) ||
          normalize(c.status) === "pending" ||
          normalize(c.status) === "ready"
        ),
      ]

      const paidCount = activePaidCampaigns.length
      const freeCount = activeFreeCampaigns.length

      // --- ACTIVE MEMBERS ---
      const activeMembers = members.filter(m => normalize(m.status) === "active")
      const connectedToPlanner = activeMembers.filter(m =>
        m.influence_planner_status === "connected"
      ).length
      const notConnectedToPlanner = activeMembers.length - connectedToPlanner

      // --- QUEUE CAPACITY ---
      const activeQueues = queues.filter(q =>
        normalize(q.status) !== "completed" && normalize(q.status) !== "cancelled"
      )
      let queueCapacity = 0
      if (activeQueues.length > 0) {
        const totalSlots = activeQueues.reduce((sum, q) => sum + (q.total_slots || 0), 0)
        const filledSlots = activeQueues.reduce((sum, q) => sum + (q.filled_slots || 0), 0)
        queueCapacity = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0
      }

      // --- SYSTEM HEALTH ---
      const totalIntegrations = integrationStatus.length
      const healthyIntegrations = integrationStatus.filter(i =>
        i.status === "linked" || i.status === "connected"
      ).length
      const successRate = totalIntegrations > 0
        ? Math.round((healthyIntegrations / totalIntegrations) * 1000) / 10
        : 100

      const automationFailures24h = automationHealth.filter(a => {
        if (a.status !== "error" && a.status !== "failed") return false
        const lastError = a.last_error_at ? new Date(a.last_error_at) : null
        return lastError && lastError >= twentyFourHoursAgo
      }).length

      const activeWarnings = automationHealth.filter(a =>
        a.status === "warning" || a.status === "degraded"
      ).length + integrationStatus.filter(i =>
        i.status === "reconnect" || i.status === "error"
      ).length

      // --- AVG CAMPAIGN VALUE ---
      const avgCampaignValue = paidCount > 0
        ? activePaidCampaigns.reduce((sum, c) =>
            sum + (parseNum(c.sales_price) || parseNum(c.price_usd) || 0)
          , 0) / paidCount
        : 0

      // --- TODAY'S THROUGHPUT ---
      const todayStr = todayStart.toISOString().split("T")[0]

      const tracksProcessed = todaySchedules.filter(s =>
        normalize(s.status) === "completed"
      ).length

      const campaignsCompletedToday = [
        ...scCampaigns.filter(c => {
          if (!["complete", "completed", "done"].includes(normalize(c.status))) return false
          const updated = c.updated_at ? new Date(c.updated_at) : null
          return updated && updated >= todayStart
        }),
        ...campaigns.filter(c => {
          if (!["complete", "completed", "done"].includes(normalize(c.status))) return false
          const updated = c.updated_at ? new Date(c.updated_at) : null
          return updated && updated >= todayStart
        }),
      ].length

      const newEntriesToday = [
        ...scSubmissions.filter(s => {
          const created = s.created_at ? new Date(s.created_at) : null
          return created && created >= todayStart
        }),
        ...submissions.filter(s => {
          const created = s.created_at || s.submitted_at
          const d = created ? new Date(created) : null
          return d && d >= todayStart
        }),
        ...scCampaigns.filter(c => {
          const created = c.created_at ? new Date(c.created_at) : null
          return created && created >= todayStart
        }),
        ...campaigns.filter(c => {
          const created = c.created_at ? new Date(c.created_at) : null
          return created && created >= todayStart
        }),
      ].length

      // --- ACTIONABLE ALERTS ---
      const alerts: OperationalDashboardData["alerts"] = []

      // Failed integrations
      const failedIntegrations = integrationStatus.filter(i =>
        i.status === "disconnected" || i.status === "error"
      )
      if (failedIntegrations.length > 0) {
        alerts.push({
          id: "failed-integrations",
          type: "failed_integration",
          severity: "critical",
          title: `${failedIntegrations.length} failed integration${failedIntegrations.length > 1 ? "s" : ""}`,
          description: "Member connections require immediate reconnection",
          count: failedIntegrations.length,
        })
      }

      // Disconnected members on Influence Planner
      const disconnectedPlannerMembers = members.filter(m =>
        m.influence_planner_status === "disconnected" &&
        normalize(m.status) === "active"
      )
      if (disconnectedPlannerMembers.length > 0) {
        alerts.push({
          id: "disconnected-planner",
          type: "disconnected_member",
          severity: "warning",
          title: `${disconnectedPlannerMembers.length} disconnected from Influence Planner`,
          description: "Active members need to reconnect their Influence Planner accounts",
          count: disconnectedPlannerMembers.length,
        })
      }

      // Queue above 80% threshold
      if (queueCapacity >= 80) {
        alerts.push({
          id: "queue-threshold",
          type: "queue_threshold",
          severity: queueCapacity >= 95 ? "critical" : "warning",
          title: `Queue at ${queueCapacity}% capacity`,
          description: "Consider expanding targets or adjusting intake volume",
        })
      }

      // Stuck campaigns (active but no updates beyond threshold)
      const stuckThreshold = new Date(now.getTime() - stuckThresholdDays * 24 * 60 * 60 * 1000)
      const stuckCampaigns = [
        ...scCampaigns.filter(c => {
          if (!ACTIVE_STATUSES.includes(normalize(c.status))) return false
          const updated = c.updated_at ? new Date(c.updated_at) : null
          return updated && updated < stuckThreshold
        }),
        ...campaigns.filter(c => {
          if (!ACTIVE_STATUSES.includes(normalize(c.status))) return false
          const updated = c.updated_at ? new Date(c.updated_at) : null
          return updated && updated < stuckThreshold
        }),
      ]
      if (stuckCampaigns.length > 0) {
        alerts.push({
          id: "stuck-campaigns",
          type: "stuck_campaign",
          severity: "warning",
          title: `${stuckCampaigns.length} campaign${stuckCampaigns.length > 1 ? "s" : ""} stuck`,
          description: `No progress in ${stuckThresholdDays}+ days — review and take action`,
          count: stuckCampaigns.length,
        })
      }

      // Automation failures
      if (automationFailures24h > 0) {
        alerts.push({
          id: "automation-failures",
          type: "failed_integration",
          severity: "critical",
          title: `${automationFailures24h} automation failure${automationFailures24h > 1 ? "s" : ""} in 24h`,
          description: "Check automation logs and resolve errors",
          count: automationFailures24h,
        })
      }

      return {
        monthlyRevenue: {
          total: currentMonthRevenue,
          previousMonth: previousMonthRevenue,
          percentChange: Math.round(percentChange * 10) / 10,
        },
        activeCampaigns: {
          total: paidCount + freeCount,
          paid: paidCount,
          free: freeCount,
        },
        activeMembers: {
          total: activeMembers.length,
          connectedToPlanner,
          notConnectedToPlanner,
        },
        systemHealth: {
          successRate,
          automationFailures24h,
          activeWarnings,
        },
        queueCapacity,
        avgCampaignValue: Math.round(avgCampaignValue),
        throughput: {
          tracksProcessed,
          campaignsCompleted: campaignsCompletedToday,
          newEntries: newEntriesToday,
        },
        alerts,
      }
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}
