import { PlatformPlaceholder } from "@/components/platform/platform-placeholder"
import { Headphones } from "lucide-react"

export default function SoundCloudPage() {
  return (
    <PlatformPlaceholder
      platform="SoundCloud"
      icon={Headphones}
      status="connected"
      description="Manage your SoundCloud tracks and community"
      features={[
        "Track upload and management",
        "Play count analytics",
        "Listener demographics",
        "Comment management",
        "Playlist curation",
        "Community engagement",
      ]}
      comingSoon={true}
    />
  )
}
