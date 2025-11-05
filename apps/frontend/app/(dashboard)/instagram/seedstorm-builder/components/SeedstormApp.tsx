"use client"

import { AuthProvider } from "../contexts/AuthContext"
import { Toaster } from "./ui/toaster"
import { Toaster as Sonner } from "./ui/sonner"

interface SeedstormAppProps {
  children?: React.ReactNode;
}

export function SeedstormApp({ children }: SeedstormAppProps) {
  // QueryClientProvider is now in the Instagram layout.tsx
  // This component only provides AuthProvider and Toasters
  return (
    <AuthProvider>
      <Toaster />
      <Sonner />
      {children}
    </AuthProvider>
  )
}

