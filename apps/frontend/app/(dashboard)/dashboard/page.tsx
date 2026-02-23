"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useUnifiedDashboard } from "@/hooks/useUnifiedDashboard"
import { useInvoiceHealth } from "@/hooks/useInvoiceHealth"
import { usePlatformDeliveryHealth } from "@/hooks/usePlatformDeliveryHealth"
import { useAlertsFeed } from "@/hooks/useAlertsFeed"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ActiveRevenueCard } from "@/components/dashboard/ActiveRevenueCard"
import { InvoiceHealthCard } from "@/components/dashboard/InvoiceHealthCard"
import { CampaignRiskCard } from "@/components/dashboard/CampaignRiskCard"
import { OpsQueueCard } from "@/components/dashboard/OpsQueueCard"
import { CampaignFunnelCard } from "@/components/dashboard/CampaignFunnelCard"
import { DeadlinesCard } from "@/components/dashboard/DeadlinesCard"
import { PlatformHealthCard } from "@/components/dashboard/PlatformHealthCard"
import { EndingSoonCard } from "@/components/dashboard/EndingSoonCard"
import { AlertsFeedCard } from "@/components/dashboard/AlertsFeedCard"
import { ProfitabilityRiskCard } from "@/components/dashboard/ProfitabilityRiskCard"
import { RefreshCw } from "lucide-react"

function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
}

function WideCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()

  const unified = useUnifiedDashboard()
  const invoices = useInvoiceHealth()
  const platforms = usePlatformDeliveryHealth()
  const alerts = useAlertsFeed()

  useEffect(() => {
    if (user?.role === "vendor") {
      router.push("/spotify/vendor")
    } else if (user?.role === "salesperson") {
      router.push("/spotify/salesperson")
    }
  }, [user, router])

  if (user?.role === "vendor" || user?.role === "salesperson") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const isLoading = unified.isLoading || invoices.isLoading || platforms.isLoading || alerts.isLoading
  const hasError = unified.isError || invoices.isError || platforms.isError || alerts.isError

  const handleRefresh = () => {
    unified.refetch()
    invoices.refetch()
    platforms.refetch()
    alerts.refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ops Dashboard</h1>
          <p className="text-muted-foreground">
            Revenue, delivery status, and risk across all services
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/ops-queue">Ops Queue</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/campaign-intake">New Campaign</Link>
          </Button>
        </div>
      </div>

      {hasError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">
            Some data failed to load. Displayed values may be incomplete.
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* ROW 1 — Revenue + Risk Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {unified.isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <ActiveRevenueCard
              activeRevenue={unified.data?.revenue.activeRevenue ?? 0}
              momChange={unified.data?.revenue.momChange ?? 0}
              activeCampaignCount={unified.data?.revenue.activeCampaignCount ?? 0}
            />
            <InvoiceHealthCard
              paidTotal={invoices.data?.paidTotal ?? 0}
              outstandingTotal={invoices.data?.outstandingTotal ?? 0}
              overdueTotal={invoices.data?.overdueTotal ?? 0}
              overdueCount={invoices.data?.overdueCount ?? 0}
            />
            <CampaignRiskCard
              total={unified.data?.risk.total ?? 0}
              missingAssets={unified.data?.risk.missingAssets ?? 0}
              behindSchedule={unified.data?.risk.behindSchedule ?? 0}
              apiFailures={unified.data?.risk.apiFailures ?? 0}
              reportsOverdue={unified.data?.risk.reportsOverdue ?? 0}
            />
            <OpsQueueCard
              totalPendingTasks={unified.data?.opsLoad.totalPendingTasks ?? 0}
              avgTaskAgeDays={unified.data?.opsLoad.avgTaskAgeDays ?? 0}
              bottleneckPlatform={unified.data?.opsLoad.bottleneckPlatform ?? "None"}
              onClick={() => router.push("/ops-queue")}
            />
          </>
        )}
      </div>

      {/* ROW 2 — Campaign Flow + Deadlines */}
      <div className="grid gap-4 md:grid-cols-2">
        {unified.isLoading ? (
          <>
            <WideCardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <CampaignFunnelCard
              intake={unified.data?.funnel.intake ?? 0}
              setup={unified.data?.funnel.setup ?? 0}
              active={unified.data?.funnel.active ?? 0}
              reporting={unified.data?.funnel.reporting ?? 0}
              completed={unified.data?.funnel.completed ?? 0}
            />
            <DeadlinesCard
              reportsDue={unified.data?.deadlines.reportsDue ?? 0}
              campaignsEnding={unified.data?.deadlines.campaignsEnding ?? 0}
              finalReviews={unified.data?.deadlines.finalReviews ?? 0}
            />
          </>
        )}
      </div>

      {/* ROW 3 — Platform Delivery Health */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {platforms.isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <PlatformHealthCard
              platform="spotify"
              stats={[
                { label: "Active Campaigns", value: platforms.data?.spotify.activeCampaigns ?? 0 },
                { label: "Avg Pace", value: `${platforms.data?.spotify.avgPacePercent ?? 0}%` },
                { label: "Behind Schedule", value: platforms.data?.spotify.behindPace ?? 0 },
              ]}
              statusBadge={{
                label: platforms.data?.spotify.apiConnected ? "API Connected" : "API Issue",
                variant: platforms.data?.spotify.apiConnected ? "healthy" : "critical",
              }}
              onClick={() => router.push("/spotify/stream-strategist")}
            />
            <PlatformHealthCard
              platform="instagram"
              stats={[
                { label: "Active Campaigns", value: platforms.data?.instagram.activeCampaigns ?? 0 },
                { label: "Scheduled Today", value: platforms.data?.instagram.scheduledToday ?? 0 },
                { label: "Pending Approval", value: platforms.data?.instagram.pendingApproval ?? 0 },
              ]}
              onClick={() => router.push("/instagram")}
            />
            <PlatformHealthCard
              platform="youtube"
              stats={[
                { label: "Monitoring", value: platforms.data?.youtube.monitoringPhase ?? 0 },
                { label: "Ratio Alerts", value: platforms.data?.youtube.ratioAlerts ?? 0 },
                { label: "API Issues", value: platforms.data?.youtube.apiIssues ?? 0 },
              ]}
              onClick={() => router.push("/youtube")}
            />
            <PlatformHealthCard
              platform="soundcloud"
              stats={[
                { label: "Active Campaigns", value: platforms.data?.soundcloud.activeCampaigns ?? 0 },
                { label: "Scheduled Today", value: platforms.data?.soundcloud.scheduledToday ?? 0 },
                { label: "Missed Actions", value: platforms.data?.soundcloud.missedActions ?? 0 },
              ]}
              statusBadge={
                (platforms.data?.soundcloud.missedActions ?? 0) > 0
                  ? { label: "Missed Actions", variant: "warning" as const }
                  : undefined
              }
              onClick={() => router.push("/soundcloud")}
            />
          </>
        )}
      </div>

      {/* ROW 4 — Future Revenue + Alerts + Profitability */}
      <div className="grid gap-4 md:grid-cols-3">
        {unified.isLoading || alerts.isLoading ? (
          <>
            <WideCardSkeleton />
            <WideCardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <EndingSoonCard campaigns={unified.data?.endingSoon ?? []} />
            <AlertsFeedCard alerts={alerts.data ?? []} />
            <ProfitabilityRiskCard
              campaigns={unified.data?.profitability ?? []}
              lowMarginCount={unified.data?.lowMarginCount ?? 0}
            />
          </>
        )}
      </div>
    </div>
  )
}
