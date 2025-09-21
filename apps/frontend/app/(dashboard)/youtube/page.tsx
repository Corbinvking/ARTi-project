import { PlatformPlaceholder } from "@/components/platform/platform-placeholder"
import { Youtube } from "lucide-react"

export default function YouTubePage() {
  return (
    <PlatformPlaceholder
      platform="YouTube"
      icon={Youtube}
      status="disconnected"
      description="Manage your YouTube channel and video content"
      features={[
        "Video upload and management",
        "Channel analytics",
        "Subscriber insights",
        "Revenue tracking",
        "Comment moderation",
        "Thumbnail optimization",
      ]}
    />
  )
}
