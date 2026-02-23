import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"

interface OpsQueueCardProps {
  totalPendingTasks: number
  avgTaskAgeDays: number
  bottleneckPlatform: string
  onClick?: () => void
}

export function OpsQueueCard({ totalPendingTasks, avgTaskAgeDays, bottleneckPlatform, onClick }: OpsQueueCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Ops Queue Summary</CardTitle>
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalPendingTasks} Active Tasks</div>
        <p className="text-xs text-muted-foreground mt-1">
          Avg Age: {avgTaskAgeDays} Days
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Bottleneck: <span className="font-medium text-foreground">{bottleneckPlatform}</span>
        </p>
      </CardContent>
    </Card>
  )
}
