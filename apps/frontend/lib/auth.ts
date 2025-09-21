// Mock auth service - replace with actual Supabase integration
export interface User {
  id: string
  email: string
  role: "admin" | "manager" | "analyst" | "creator"
  tenantId: string
  name: string
}

export interface AuthState {
  user: User | null
  loading: boolean
}

// Mock user data
const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@company.com",
    role: "admin",
    tenantId: "tenant-1",
    name: "Admin User",
  },
  {
    id: "2",
    email: "manager@company.com",
    role: "manager",
    tenantId: "tenant-1",
    name: "Manager User",
  },
]

export const authService = {
  async signIn(email: string, password: string): Promise<User | null> {
    // Mock authentication
    const user = mockUsers.find((u) => u.email === email)
    if (user && password === "password") {
      localStorage.setItem("auth-user", JSON.stringify(user))
      return user
    }
    throw new Error("Invalid credentials")
  },

  async signOut(): Promise<void> {
    localStorage.removeItem("auth-user")
  },

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem("auth-user")
    return stored ? JSON.parse(stored) : null
  },

  hasRole(user: User | null, roles: string[]): boolean {
    return user ? roles.includes(user.role) : false
  },
}
