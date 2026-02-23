import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, AlertTriangle, FileWarning, Wifi, BarChart3, Receipt } from "lucide-react"
import type { Alert, AlertType } from "@/hooks/useAlertsFeed"

interface AlertsFeedCardProps {
  alerts: Alert[]
  onClick?: () => void
}

const alertIcon: Record<AlertType, typeof AlertTriangle> = {
  invoice_overdue: Receipt,
  underperforming: BarChart3,
  missing_assets: FileWarning,
  report_overdue: FileWarning,
  api_disconnected: Wifi,
}

const alertColor: Record<AlertType, string> = {
  invoice_overdue: "text-red-500",
  underperforming: "text-orange-500",
  missing_assets: "text-yellow-500",
  report_overdue: "text-purple-500",
  api_disconnected: "text-red-500",
}

export function AlertsFeedCard({ alerts, onClick }: AlertsFeedCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle>
        <div className="flex items-center gap-1">
          {alerts.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
              {alerts.length}
            </Badge>
          )}
          <Bell className={`h-4 w-4 ${alerts.length > 0 ? "text-red-500" : "text-muted-foreground"}`} />
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actionable alerts</p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {alerts.slice(0, 10).map(alert => {
              const Icon = alertIcon[alert.type] || AlertTriangle
              const color = alertColor[alert.type] || "text-muted-foreground"
              return (
                <div key={alert.id} className="flex gap-2 py-1.5 border-b last:border-0">
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{alert.title}</span>
                      {alert.severity === "critical" && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1">
                          URGENT
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{alert.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
