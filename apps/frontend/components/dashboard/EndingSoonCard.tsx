import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

interface EndingSoonItem {
  id: string
  artist: string
  service: string
  endDate: string
  performanceStatus: "on_track" | "overperforming" | "underperforming"
  daysLeft: number
}

interface EndingSoonCardProps {
  campaigns: EndingSoonItem[]
  onClick?: () => void
}

const statusLabel = {
  on_track: { text: "On Track", className: "bg-green-50 text-green-700 border-green-200" },
  overperforming: { text: "Over", className: "bg-blue-50 text-blue-700 border-blue-200" },
  underperforming: { text: "Under", className: "bg-red-50 text-red-700 border-red-200" },
}

const urgencyColor = (days: number) => {
  if (days <= 7) return "text-red-600 font-semibold"
  if (days <= 14) return "text-yellow-600 font-medium"
  return "text-muted-foreground"
}

export function EndingSoonCard({ campaigns, onClick }: EndingSoonCardProps) {
  const within7 = campaigns.filter(c => c.daysLeft <= 7).length
  const within14 = campaigns.filter(c => c.daysLeft > 7 && c.daysLeft <= 14).length
  const within30 = campaigns.filter(c => c.daysLeft > 14).length

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Ending Soon</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-3 text-xs">
          <span className="text-red-600 font-semibold">{within7} in 7d</span>
          <span className="text-yellow-600">{within14} in 14d</span>
          <span className="text-muted-foreground">{within30} in 30d</span>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No campaigns ending soon</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {campaigns.slice(0, 8).map(c => {
              const status = statusLabel[c.performanceStatus]
              return (
                <div key={c.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.artist}</div>
                    <div className="text-[10px] text-muted-foreground">{c.service}</div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${status.className}`}>
                    {status.text}
                  </Badge>
                  <span className={`text-xs shrink-0 w-10 text-right ${urgencyColor(c.daysLeft)}`}>
                    {c.daysLeft}d
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
