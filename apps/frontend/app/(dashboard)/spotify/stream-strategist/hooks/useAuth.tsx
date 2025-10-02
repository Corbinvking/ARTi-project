"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useAuth as useUnifiedAuth } from "@/hooks/use-auth"

interface StreamStrategistUser {
  id: string
  email: string
  role: string
  org_id?: string
}

interface AuthContextType {
  user: StreamStrategistUser | null
  currentRole: string | null
  hasRole: (role: string) => boolean
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const unifiedAuth = useUnifiedAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Map unified auth user to Stream Strategist format
    if (unifiedAuth.user) {
      setLoading(false)
    }
  }, [unifiedAuth.user])

  const streamStrategistUser: StreamStrategistUser | null = unifiedAuth.user ? {
    id: unifiedAuth.user.id,
    email: unifiedAuth.user.email,
    role: unifiedAuth.user.role || 'user',
    org_id: unifiedAuth.user.org_id
  } : null

  const hasRole = (role: string): boolean => {
    if (!streamStrategistUser) return false
    return streamStrategistUser.role === role
  }

  const signOut = async (): Promise<void> => {
    await unifiedAuth.signOut()
  }

  const value: AuthContextType = {
    user: streamStrategistUser,
    currentRole: streamStrategistUser?.role || null,
    hasRole,
    signOut,
    loading: unifiedAuth.loading || loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}







