import { MetricCard } from "@/components/dashboard/metric-card"
import { PlatformOverview } from "@/components/dashboard/platform-overview"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { Users, TrendingUp, MessageSquare, Eye, Calendar, Target } from "lucide-react"

export default function DashboardPage() {
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
