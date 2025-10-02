"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "./ui/tooltip"
import { AuthProvider } from "../hooks/useAuth"
import { ErrorBoundary } from "./ErrorBoundary"
import { Toaster } from "./ui/toaster"
import { Toaster as Sonner } from "./ui/sonner"
import { GuidedTour } from "./HelpSystem"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

interface StreamStrategistAppProps {
  children?: React.ReactNode;
}

export function StreamStrategistApp({ children }: StreamStrategistAppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthProvider>
            <Toaster />
            <Sonner />
            {children}
            <GuidedTour />
          </AuthProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  )
}








