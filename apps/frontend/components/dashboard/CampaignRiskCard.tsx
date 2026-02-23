import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert } from "lucide-react"

interface CampaignRiskCardProps {
  total: number
  missingAssets: number
  behindSchedule: number
  apiFailures: number
  reportsOverdue: number
  onClick?: () => void
}

export function CampaignRiskCard({ total, missingAssets, behindSchedule, apiFailures, reportsOverdue, onClick }: CampaignRiskCardProps) {
  const severity = total === 0 ? "healthy" : total <= 3 ? "warning" : "critical"
  const borderColor = {
    healthy: "border-l-green-500",
    warning: "border-l-yellow-500",
    critical: "border-l-red-500",
  }[severity]

  return (
    <Card className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${borderColor}`} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Campaign Risk</CardTitle>
        <ShieldAlert className={`h-4 w-4 ${total > 0 ? "text-red-500" : "text-green-500"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {total > 0 ? `${total} Need Attention` : "All Clear"}
        </div>
        {total > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {missingAssets > 0 && (
              <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 text-xs">
                {missingAssets} Missing Assets
              </Badge>
            )}
            {behindSchedule > 0 && (
              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs">
                {behindSchedule} Behind Schedule
              </Badge>
            )}
            {apiFailures > 0 && (
              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs">
                {apiFailures} API Failure
              </Badge>
            )}
            {reportsOverdue > 0 && (
              <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50 text-xs">
                {reportsOverdue} Reports Overdue
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
