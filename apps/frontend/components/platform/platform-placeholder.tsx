import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { LucideIcon } from "lucide-react"

interface PlatformPlaceholderProps {
  platform: string
  icon: LucideIcon
  status: "connected" | "disconnected" | "error"
  description: string
  features: string[]
  comingSoon?: boolean
}

export function PlatformPlaceholder({
  platform,
  icon: Icon,
  status,
  description,
  features,
  comingSoon = false,
}: PlatformPlaceholderProps) {
  const statusColor = {
    connected: "bg-green-500",
    disconnected: "bg-yellow-500",
    error: "bg-red-500",
  }[status]

  const statusText = {
    connected: "Connected",
    disconnected: "Not Connected",
    error: "Connection Error",
  }[status]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-card border border-border">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{platform}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <Badge variant={status === "connected" ? "default" : "secondary"}>{statusText}</Badge>
        </div>
      </div>

      {comingSoon && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary">Coming Soon</h3>
              <p className="text-muted-foreground mt-2">
                This platform integration is currently under development and will be available soon.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === "connected" ? (
              <>
                <Button className="w-full bg-transparent" variant="outline">
                  View Analytics
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  Manage Content
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  Schedule Posts
                </Button>
              </>
            ) : (
              <>
                <Button className="w-full">Connect {platform}</Button>
                <Button className="w-full bg-transparent" variant="outline">
                  View Documentation
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {status === "connected" && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Platform-specific content will be loaded here</p>
              <p className="text-sm mt-2">This area is ready for micro-application integration</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
