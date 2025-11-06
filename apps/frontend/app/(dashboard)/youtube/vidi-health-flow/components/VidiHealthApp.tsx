"use client"

import { AuthProvider } from "../contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

interface VidiHealthAppProps {
  children?: React.ReactNode;
}

export function VidiHealthApp({ children }: VidiHealthAppProps) {
  // QueryClientProvider is in layout.tsx
  // This component only provides app-specific contexts
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </AuthProvider>
  )
}

