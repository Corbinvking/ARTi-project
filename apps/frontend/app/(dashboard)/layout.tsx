"use client"

export const dynamic = 'force-dynamic'

import type React from "react"

import { AuthProvider } from "@/hooks/use-auth"
import { ProtectedLayout } from "@/components/dashboard/protected-layout"
import { Toaster } from "sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProtectedLayout>{children}</ProtectedLayout>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}
