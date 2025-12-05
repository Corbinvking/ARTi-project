"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { PlatformNavigation } from "@/components/navigation/platform-navigation"
import { UserMenu } from "@/components/navigation/user-menu"

interface ProtectedLayoutProps {
  children: React.ReactNode
  requiredRoles?: string[]
  hideNavigation?: boolean
  hideHeader?: boolean
}

export function ProtectedLayout({
  children,
  requiredRoles,
  hideNavigation = false,
  hideHeader = false,
}: ProtectedLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Redirect members to their portal - they can ONLY access /soundcloud/portal/*
  useEffect(() => {
    if (!loading && user && user.role === 'member') {
      const isAllowedPath = pathname?.startsWith('/soundcloud/portal')
      if (!isAllowedPath) {
        console.log('🚫 Member access blocked, redirecting to portal')
        router.push("/soundcloud/portal")
      }
    }
  }, [user, loading, pathname, router])

  useEffect(() => {
    if (user && requiredRoles && !requiredRoles.includes(user.role)) {
      // Members get redirected to portal, others to dashboard
      if (user.role === 'member') {
        router.push("/soundcloud/portal")
      } else {
        router.push("/dashboard")
      }
    }
  }, [user, requiredRoles, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {!hideHeader && (
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">Marketing Operations</h1>
            <UserMenu />
          </div>
        </header>
      )}
      {!hideNavigation && <PlatformNavigation />}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
