import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarClock } from "lucide-react"

interface DeadlinesCardProps {
  reportsDue: number
  campaignsEnding: number
  finalReviews: number
  onClick?: () => void
}

export function DeadlinesCard({ reportsDue, campaignsEnding, finalReviews, onClick }: DeadlinesCardProps) {
  const total = reportsDue + campaignsEnding + finalReviews
  const hasCritical = campaignsEnding > 3 || reportsDue > 2

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Next 7 Days</CardTitle>
        <CalendarClock className={`h-4 w-4 ${hasCritical ? "text-red-500" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-sm text-muted-foreground">No upcoming deadlines</div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm">Reports Due</span>
              <Badge variant={reportsDue > 0 ? "destructive" : "secondary"} className="text-xs">
                {reportsDue}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Campaigns Ending</span>
              <Badge variant={campaignsEnding > 0 ? "default" : "secondary"} className="text-xs">
                {campaignsEnding}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Final Reviews Required</span>
              <Badge variant={finalReviews > 0 ? "default" : "secondary"} className="text-xs">
                {finalReviews}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
