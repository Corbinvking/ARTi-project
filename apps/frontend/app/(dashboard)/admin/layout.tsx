"use client"

import type React from "react"

import { AuthProvider } from "@/hooks/use-auth"
import { ProtectedLayout } from "@/components/dashboard/protected-layout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ProtectedLayout requiredRoles={["admin"]} hideNavigation={true} hideHeader={true}>
        {children}
      </ProtectedLayout>
    </AuthProvider>
  )
}
