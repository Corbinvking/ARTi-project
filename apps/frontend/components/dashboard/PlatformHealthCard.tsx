import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Music2, Instagram, Youtube, Cloud, type LucideIcon } from "lucide-react"

type PlatformType = "spotify" | "instagram" | "youtube" | "soundcloud"

interface PlatformHealthCardProps {
  platform: PlatformType
  stats: Array<{ label: string; value: string | number }>
  statusBadge?: { label: string; variant: "healthy" | "warning" | "critical" }
  onClick?: () => void
}

const platformConfig: Record<PlatformType, { label: string; icon: LucideIcon; color: string; gradient: string }> = {
  spotify: {
    label: "Spotify",
    icon: Music2,
    color: "text-green-500",
    gradient: "border-l-green-500",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    gradient: "border-l-pink-500",
  },
  youtube: {
    label: "YouTube",
    icon: Youtube,
    color: "text-red-500",
    gradient: "border-l-red-500",
  },
  soundcloud: {
    label: "SoundCloud",
    icon: Cloud,
    color: "text-orange-500",
    gradient: "border-l-orange-500",
  },
}

const badgeStyles = {
  healthy: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  critical: "bg-red-50 text-red-700 border-red-200",
}

export function PlatformHealthCard({ platform, stats, statusBadge, onClick }: PlatformHealthCardProps) {
  const config = platformConfig[platform]
  const Icon = config.icon

  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${config.gradient}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <CardTitle className="text-sm font-medium">{config.label} Delivery</CardTitle>
        </div>
        {statusBadge && (
          <Badge variant="outline" className={`text-[10px] ${badgeStyles[statusBadge.variant]}`}>
            {statusBadge.label}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <span className="text-sm font-medium">{stat.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
