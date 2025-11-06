import { SystemHealthDashboard } from "../components/admin/SystemHealthDashboard";

export default function SystemHealth() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">
          Monitor system performance and health metrics.
        </p>
      </div>
      <SystemHealthDashboard />
    </div>
  );
}