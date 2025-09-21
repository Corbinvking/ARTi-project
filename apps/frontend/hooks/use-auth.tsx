"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { type User, authService } from "@/lib/auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const user = await authService.signIn(email, password)
      setUser(user)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await authService.signOut()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
