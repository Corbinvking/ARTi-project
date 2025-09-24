"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

interface Tab {
  id: string
  label: string
  href: string
  platform?: string
  adminOnly?: boolean
}

const tabs: Tab[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", platform: "dashboard" },
  { id: "spotify", label: "Spotify", href: "/spotify", platform: "spotify" },
  { id: "instagram", label: "Instagram", href: "/instagram", platform: "instagram" },
  { id: "youtube", label: "YouTube", href: "/youtube", platform: "youtube" },
  { id: "soundcloud", label: "SoundCloud", href: "/soundcloud", platform: "soundcloud" },
  { id: "admin", label: "Admin", href: "/admin", adminOnly: true },
]

export function TabNavigation() {
  const pathname = usePathname()
  const { user } = useAuth()

  // Debug logging
  console.log('🔍 TabNavigation - User:', user?.email, 'Role:', user?.role, 'Permissions:', user?.permissions?.length || 0)
  if (user?.permissions) {
    user.permissions.forEach(p => console.log('  -', p.platform, 'read:', p.can_read))
  }

  const visibleTabs = tabs.filter((tab) => {
    if (!user) return false
    
    // Admin-only tabs
    if (tab.adminOnly) {
      return user.role === 'admin'
    }
    
    // Platform-based tabs - check permissions
    if (tab.platform) {
      // Prefer database permissions if available
      if (user.permissions && user.permissions.length > 0) {
        const permission = user.permissions.find(p => p.platform === tab.platform)
        const hasAccess = permission?.can_read || false
        console.log(`🔍 Permission check for ${tab.platform}: ${hasAccess} (from database)`)
        return hasAccess
      }
      
      // Fallback to role-based access when permissions haven't loaded
      console.log('⚠️ No permissions loaded, using role fallback for:', tab.platform)
      switch (user.role) {
        case 'admin':
          return true // Admin can see all tabs
        case 'manager':
          return ['dashboard', 'instagram', 'spotify', 'soundcloud', 'youtube'].includes(tab.platform)
        case 'sales':
          return ['dashboard', 'instagram', 'spotify', 'youtube'].includes(tab.platform)
        case 'vendor':
          return ['dashboard', 'spotify', 'soundcloud'].includes(tab.platform)
        default:
          return false
      }
    }
    
    // Non-platform tabs (shouldn't happen with current setup)
    return false
  })

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {visibleTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
