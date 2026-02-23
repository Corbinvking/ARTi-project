import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PiggyBank } from "lucide-react"

interface ProfitabilityItem {
  id: string
  name: string
  revenue: number
  vendorCost: number
  margin: number
  level: "healthy" | "warning" | "critical"
}

interface ProfitabilityRiskCardProps {
  campaigns: ProfitabilityItem[]
  lowMarginCount: number
  onClick?: () => void
}

const levelStyle = {
  healthy: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  critical: "bg-red-50 text-red-700 border-red-200",
}

export function ProfitabilityRiskCard({ campaigns, lowMarginCount, onClick }: ProfitabilityRiskCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Profitability Risk</CardTitle>
        <PiggyBank className={`h-4 w-4 ${lowMarginCount > 0 ? "text-red-500" : "text-green-500"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-lg font-bold">
          {lowMarginCount > 0
            ? `${lowMarginCount} Under 20% Margin`
            : "Margins Healthy"}
        </div>
        {campaigns.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-1">No campaigns at risk</p>
        ) : (
          <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
            {campaigns.slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-0">
                <span className="text-xs font-medium truncate flex-1">{c.name}</span>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${levelStyle[c.level]}`}>
                  {c.margin.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
