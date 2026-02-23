import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react"

interface ActiveRevenueCardProps {
  activeRevenue: number
  momChange: number
  activeCampaignCount: number
  onClick?: () => void
}

const formatCurrency = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return `$${n.toLocaleString()}`
}

export function ActiveRevenueCard({ activeRevenue, momChange, activeCampaignCount, onClick }: ActiveRevenueCardProps) {
  const isPositive = momChange >= 0

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaign Revenue</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(activeRevenue)}</div>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{momChange.toFixed(0)}% vs Last Month
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{activeCampaignCount} Active Campaigns</p>
      </CardContent>
    </Card>
  )
}
