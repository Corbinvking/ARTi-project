"use client"

import { UnifiedCampaignIntake } from "@/components/campaign-intake/UnifiedCampaignIntake"

export default function CampaignIntakePage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Campaign Intake</h1>
          <p className="text-muted-foreground">
            Create campaigns across Spotify, SoundCloud, Instagram, and YouTube from one flow.
          </p>
        </div>
        <UnifiedCampaignIntake />
      </div>
    </div>
  )
}
