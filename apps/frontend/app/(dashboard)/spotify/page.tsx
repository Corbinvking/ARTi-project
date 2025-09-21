import { PlatformPlaceholder } from "@/components/platform/platform-placeholder"
import { Music } from "lucide-react"

export default function SpotifyPage() {
  return (
    <PlatformPlaceholder
      platform="Spotify"
      icon={Music}
      status="connected"
      description="Manage your music streaming and artist analytics"
      features={[
        "Track streaming analytics",
        "Playlist management",
        "Artist insights and demographics",
        "Release scheduling",
        "Fan engagement metrics",
        "Revenue tracking",
      ]}
    />
  )
}
