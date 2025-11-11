"use client"

import { AuthProvider } from "../contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"

interface SoundCloudAppProps {
  children?: React.ReactNode;
}

export function SoundCloudApp({ children }: SoundCloudAppProps) {
  return (
    <AuthProvider>
      <Toaster />
      <Sonner />
      {children}
    </AuthProvider>
  )
}

export { SoundCloudApp as default };


