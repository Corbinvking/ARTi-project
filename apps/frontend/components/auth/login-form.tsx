"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { signIn, loading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const user = await signIn(email, password)
      
      // Redirect based on user role
      if (user?.role === 'member' || user?.isMember) {
        // SoundCloud members go to member portal
        router.push("/soundcloud/portal")
      } else if (user?.role === 'vendor') {
        // Spotify vendors go to vendor dashboard
        router.push("/spotify/stream-strategist/vendor")
      } else {
        // Admin, manager, sales go to main dashboard
        router.push("/dashboard")
      }
    } catch (err) {
      setError("Invalid credentials")
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Marketing Operations</CardTitle>
        <CardDescription>Sign in to your dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              required
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Demo credentials:</p>
          <p>admin@company.com / password</p>
          <p>manager@company.com / password</p>
        </div>
      </CardContent>
    </Card>
  )
}
