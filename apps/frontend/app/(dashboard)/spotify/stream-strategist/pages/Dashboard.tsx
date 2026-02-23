"use client"

import { useEffect } from "react";
import { insertSampleData } from "../lib/sampleData";
import { ExecutiveDashboard } from "../components/ExecutiveDashboard";
import { QuickActions } from "../components/QuickActions";
import { LiveOpsStatus } from "../components/LiveOpsStatus";

export default function Dashboard() {
  useEffect(() => {
    insertSampleData();
  }, []);

  return (
    <div className="space-y-8 -mt-6" data-tour="dashboard">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-6">
        <h1 className="hero-title">
          SPOTIFY OPS DASHBOARD
        </h1>
        <p className="hero-subtitle">
          Campaign delivery, vendor operations, and financial oversight
        </p>
      </section>

      {/* Quick Actions Section */}
      <section data-tour="quick-actions">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <QuickActions />
      </section>

      {/* Live Ops Status */}
      <section>
        <LiveOpsStatus />
      </section>

      {/* Executive Dashboard */}
      <section>
        <ExecutiveDashboard />
      </section>
    </div>
  );
}
