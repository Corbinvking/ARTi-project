"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { UnifiedCampaignIntake } from "@/components/campaign-intake/UnifiedCampaignIntake"

export function FinancialIntegration() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span>Invoice &amp; Campaign Intake</span>
        </CardTitle>
        <CardDescription>
          Create an internal invoice and instantly generate campaigns for selected services.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UnifiedCampaignIntake mode="invoice" />
      </CardContent>
    </Card>
  )
}
