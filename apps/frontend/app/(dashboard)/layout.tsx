"use client"

import type React from "react"

import { AuthProvider } from "@/hooks/use-auth"
import { ProtectedLayout } from "@/components/dashboard/protected-layout"
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ProtectedLayout>{children}</ProtectedLayout>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  )
}
