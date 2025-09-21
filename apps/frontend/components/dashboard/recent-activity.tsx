import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Activity {
  id: string
  type: "post" | "engagement" | "follower" | "error"
  platform: string
  message: string
  timestamp: string
}

const recentActivities: Activity[] = [
  {
    id: "1",
    type: "post",
    platform: "Instagram",
    message: "New post published: 'Behind the scenes'",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    type: "engagement",
    platform: "Spotify",
    message: "Track reached 10K plays",
    timestamp: "4 hours ago",
  },
  {
    id: "3",
    type: "follower",
    platform: "SoundCloud",
    message: "100 new followers this week",
    timestamp: "1 day ago",
  },
  {
    id: "4",
    type: "error",
    platform: "YouTube",
    message: "API connection failed",
    timestamp: "2 days ago",
  },
]

export function RecentActivity() {
  const getActivityColor = (type: Activity["type"]) => {
    switch (type) {
      case "post":
        return "bg-blue-500"
      case "engagement":
        return "bg-green-500"
      case "follower":
        return "bg-primary"
      case "error":
        return "bg-red-500"
      default:
        return "bg-muted"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentActivities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type)}`} />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{activity.message}</p>
                <Badge variant="outline" className="text-xs">
                  {activity.platform}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
