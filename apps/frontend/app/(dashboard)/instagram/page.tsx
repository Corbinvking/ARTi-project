import { PlatformPlaceholder } from "@/components/platform/platform-placeholder"
import { Instagram } from "lucide-react"

export default function InstagramPage() {
  return (
    <PlatformPlaceholder
      platform="Instagram"
      icon={Instagram}
      status="connected"
      description="Manage your Instagram content and engagement"
      features={[
        "Post scheduling and publishing",
        "Story management",
        "Engagement analytics",
        "Hashtag optimization",
        "Follower insights",
        "Content performance tracking",
      ]}
    />
  )
}
