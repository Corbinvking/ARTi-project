"use client"

import { StreamStrategistApp } from "../stream-strategist/components/StreamStrategistApp"
import CampaignIntakePage from "../stream-strategist/pages/CampaignIntakePage"

export default function SpotifyCampaignIntakePage() {
  return (
    <div className="h-full w-full">
      <StreamStrategistApp>
        <CampaignIntakePage />
      </StreamStrategistApp>
    </div>
  )
}
