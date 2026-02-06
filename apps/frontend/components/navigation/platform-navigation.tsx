"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { 
  Home, 
  Database, 
  Plus, 
  History,
  Users,
  Brain,
  UserPlus,
  Music,
  Target,
  FileText
} from "lucide-react"

interface Tab {
  id: string
  label: string
  href: string
  platform?: string
  adminOnly?: boolean
  operatorOnly?: boolean
}

interface SubTab {
  id: string
  label: string
  href: string
  icon: any
  adminOnly?: boolean
  managerOnly?: boolean
  salespersonOnly?: boolean
  vendorOnly?: boolean
}

const mainTabs: Tab[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", platform: "dashboard" },
  { id: "spotify", label: "Spotify", href: "/spotify", platform: "spotify" },
  { id: "instagram", label: "Instagram", href: "/instagram", platform: "instagram" },
  { id: "youtube", label: "YouTube", href: "/youtube", platform: "youtube" },
  { id: "soundcloud", label: "SoundCloud", href: "/soundcloud", platform: "soundcloud" },
  { id: "operator", label: "Operator", href: "/operator", operatorOnly: true },
  { id: "admin", label: "Admin", href: "/admin", adminOnly: true },
]

// Stream Strategist sub-navigation
const getStreamStrategistTabs = (currentRole: string | null): SubTab[] => {
  const baseItems: SubTab[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard/spotify",
      icon: Home
    }
  ]

  if (currentRole === 'admin' || currentRole === 'manager') {
    return [
      ...baseItems,
      {
        id: "vendors",
        label: "Vendors",
        href: "/dashboard/spotify/playlists", 
        icon: Database
      },
      {
        id: "campaigns",
        label: "Campaigns",
        href: "/dashboard/spotify/campaigns",
        icon: History
      },
      {
        id: "clients",
        label: "Clients",
        href: "/dashboard/spotify/clients",
        icon: Users
      },
      {
        id: "ml-analytics",
        label: "ML Analytics",
        href: "/dashboard/spotify/ml-dashboard",
        icon: Brain
      },
      {
        id: "submissions",
        label: "Submissions",
        href: "/dashboard/spotify/submissions",
        icon: FileText
      },
      ...(currentRole === 'admin' ? [{
        id: "users", 
        label: "Users",
        href: "/dashboard/spotify/users",
        icon: UserPlus,
        adminOnly: true
      }] : [])
    ]
  }

  if (currentRole === 'salesperson') {
    return [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard/spotify/salesperson",
        icon: Home,
        salespersonOnly: true
      },
      {
        id: "submit-campaign",
        label: "Submit Campaign",
        href: "/dashboard/spotify/campaign-intake",
        icon: Plus,
        salespersonOnly: true
      },
      {
        id: "campaigns",
        label: "Campaigns",
        href: "/dashboard/spotify/campaigns",
        icon: History
      },
      {
        id: "clients",
        label: "Clients",
        href: "/dashboard/spotify/clients",
        icon: Users
      }
    ]
  }

  if (currentRole === 'vendor') {
    return [
      ...baseItems,
      {
        id: "my-playlists",
        label: "My Playlists",
        href: "/dashboard/spotify/vendor/playlists",
        icon: Music,
        vendorOnly: true
      },
      {
        id: "campaign-requests",
        label: "Campaign Requests",
        href: "/dashboard/spotify/vendor/requests",
        icon: History,
        vendorOnly: true
      }
    ]
  }

  return baseItems
}

export function PlatformNavigation() {
  const pathname = usePathname()
  const { user } = useAuth()

  // Determine which platform is active
  const activePlatform = pathname.includes('/spotify') ? 'spotify' : 
                        pathname.includes('/instagram') ? 'instagram' :
                        pathname.includes('/youtube') ? 'youtube' :
                        pathname.includes('/soundcloud') ? 'soundcloud' :
                        pathname.includes('/operator') ? 'operator' :
                        pathname.includes('/admin') ? 'admin' : 'dashboard'

  // Get visible main tabs
  const visibleMainTabs = mainTabs.filter((tab) => {
    if (!user) return false
    
    // Admin-only tabs - only admins see the Admin tab
    if (tab.adminOnly) {
      return user.role === 'admin'
    }

    // Operator-only tab - operators and admins see the Operator tab
    if (tab.operatorOnly) {
      return user.role === 'operator' || user.role === 'admin'
    }
    
    // Platform-based tabs - check permissions
    if (tab.platform) {
      // Prefer database permissions if available
      if (user.permissions && user.permissions.length > 0) {
        const permission = user.permissions.find(p => p.platform === tab.platform)
        const hasAccess = permission?.can_read || false
        return hasAccess
      }
      
      // Fallback to role-based access when permissions haven't loaded
      switch (user.role) {
        case 'admin':
          return true // Admin can see all tabs
        case 'manager':
          return ['dashboard', 'instagram', 'spotify', 'soundcloud', 'youtube'].includes(tab.platform)
        case 'operator':
          return ['dashboard', 'instagram', 'spotify', 'soundcloud', 'youtube'].includes(tab.platform)
        case 'sales':
          return ['dashboard', 'instagram', 'spotify', 'youtube'].includes(tab.platform)
        case 'vendor':
          return false // Vendors don't see platform tabs - they only see vendor portal
        default:
          return false
      }
    }
    
    return false
  })

  // Get sub-navigation for active platform
  const getSubTabs = () => {
    if (activePlatform === 'spotify') {
      return getStreamStrategistTabs(user?.role)
    }
    // Add other platform sub-navigations here as needed
    return []
  }

  const subTabs = getSubTabs()

  return (
    <div className="border-b border-border bg-card">
      {/* Main Platform Navigation */}
      <nav className="container mx-auto px-4">
        <div className="flex space-x-8">
          {visibleMainTabs.map((tab) => {
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
      </nav>

      {/* Sub-Navigation removed - Stream Strategist handles its own routing */}
    </div>
  )
}
