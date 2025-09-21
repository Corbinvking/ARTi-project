import { UserManagement } from "@/components/admin/user-management"
import { SystemSettings } from "@/components/admin/system-settings"
import { PlatformIntegrations } from "@/components/admin/platform-integrations"
import { FinancialIntegration } from "@/components/admin/financial-integration"
import { Shield } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <span>Admin Panel</span>
        </h1>
        <p className="text-muted-foreground">Manage users, system settings, and platform integrations</p>
      </div>

      <div className="grid gap-6">
        <UserManagement />
        <SystemSettings />
        <PlatformIntegrations />
        <FinancialIntegration />
      </div>
    </div>
  )
}
