"use client";

import { Suspense } from "react";
import { MemberCampaignView } from "../../soundcloud-app/components/portal/MemberCampaignView";

export default function PortalCampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MemberCampaignView />
    </Suspense>
  );
}
