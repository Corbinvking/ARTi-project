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

  const visibleTabs = tabs.filter((tab) => {
    if (!user) return false
    
    // Admin-only tabs
    if (tab.adminOnly) {
      return user.role === 'admin'
    }
    
    // Platform-based tabs - check permissions
    if (tab.platform && user.permissions) {
      const permission = user.permissions.find(p => p.platform === tab.platform)
      return permission?.can_read || false
    }
    
    // Fallback for users without permissions loaded
    return true
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
