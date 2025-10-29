"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PlatformOverview } from "@/components/dashboard/platform-overview"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { Users, TrendingUp, MessageSquare, Eye, Calendar, Target } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // Auto-redirect based on role
    if (user?.role === 'vendor') {
      console.log('Vendor detected, redirecting to vendor portal')
      router.push('/spotify/vendor')
    } else if (user?.role === 'salesperson') {
      router.push('/spotify/salesperson')
    }
  }, [user, router])

  // Show loading while redirecting
  if (user?.role === 'vendor' || user?.role === 'salesperson') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your marketing operations across all platforms</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Followers"
          value="70.1K"
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          description="Across all platforms"
        />
        <MetricCard
          title="Engagement Rate"
          value="8.2%"
          change="+2.1% from last month"
          changeType="positive"
          icon={TrendingUp}
          description="Average engagement"
        />
        <MetricCard
          title="Total Posts"
          value="198"
          change="+23 this month"
          changeType="positive"
          icon={MessageSquare}
          description="Published content"
        />
        <MetricCard
          title="Reach"
          value="2.4M"
          change="+18% from last month"
          changeType="positive"
          icon={Eye}
          description="Total impressions"
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <AnalyticsChart />
        <div className="space-y-6">
          <MetricCard
            title="Campaign Performance"
            value="94%"
            change="Above target"
            changeType="positive"
            icon={Target}
            description="Current campaign success rate"
          />
          <MetricCard
            title="Scheduled Posts"
            value="24"
            change="Next 7 days"
            changeType="neutral"
            icon={Calendar}
            description="Content pipeline"
          />
        </div>
      </div>

      {/* Platform Overview and Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <PlatformOverview />
        <RecentActivity />
      </div>
    </div>
  )
}
