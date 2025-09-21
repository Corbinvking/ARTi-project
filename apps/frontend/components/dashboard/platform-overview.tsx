import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface PlatformData {
  name: string
  status: "connected" | "disconnected" | "error"
  followers: number
  engagement: number
  posts: number
}

const platformData: PlatformData[] = [
  {
    name: "Spotify",
    status: "connected",
    followers: 12500,
    engagement: 85,
    posts: 24,
  },
  {
    name: "Instagram",
    status: "connected",
    followers: 45200,
    engagement: 92,
    posts: 156,
  },
  {
    name: "YouTube",
    status: "disconnected",
    followers: 8900,
    engagement: 0,
    posts: 0,
  },
  {
    name: "SoundCloud",
    status: "connected",
    followers: 3400,
    engagement: 78,
    posts: 18,
  },
]

export function PlatformOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {platformData.map((platform) => (
          <div key={platform.name} className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="font-medium">{platform.name}</div>
              <Badge
                variant={platform.status === "connected" ? "default" : "secondary"}
                className={platform.status === "connected" ? "bg-primary" : ""}
              >
                {platform.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div>{platform.followers.toLocaleString()} followers</div>
              {platform.status === "connected" && (
                <>
                  <div className="flex items-center space-x-2">
                    <span>Engagement</span>
                    <Progress value={platform.engagement} className="w-16" />
                    <span>{platform.engagement}%</span>
                  </div>
                  <div>{platform.posts} posts</div>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
