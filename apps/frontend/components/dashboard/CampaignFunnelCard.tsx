import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GitBranch } from "lucide-react"

interface CampaignFunnelCardProps {
  intake: number
  setup: number
  active: number
  reporting: number
  completed: number
  onClick?: () => void
}

const stages = [
  { key: "intake", label: "Intake Submitted", color: "bg-blue-500" },
  { key: "setup", label: "Setup Required", color: "bg-yellow-500" },
  { key: "active", label: "Active", color: "bg-green-500" },
  { key: "reporting", label: "Reporting", color: "bg-purple-500" },
  { key: "completed", label: "Completed (30d)", color: "bg-gray-400" },
] as const

export function CampaignFunnelCard({ intake, setup, active, reporting, completed, onClick }: CampaignFunnelCardProps) {
  const values: Record<string, number> = { intake, setup, active, reporting, completed }
  const max = Math.max(intake, setup, active, reporting, completed, 1)

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Campaign Stages</CardTitle>
        <GitBranch className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {stages.map(stage => {
            const count = values[stage.key]
            const width = max > 0 ? Math.max((count / max) * 100, 4) : 4
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className="w-28 text-xs text-muted-foreground truncate">{stage.label}</div>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full flex items-center justify-end pr-2 transition-all`}
                    style={{ width: `${width}%` }}
                  >
                    {count > 0 && (
                      <span className="text-[10px] font-bold text-white">{count}</span>
                    )}
                  </div>
                </div>
                <div className="w-6 text-right text-sm font-semibold">{count}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
