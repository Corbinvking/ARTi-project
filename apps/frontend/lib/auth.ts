// Real Supabase auth service
import { createClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  role: "admin" | "manager" | "sales" | "vendor" | "analyst" | "creator"
  tenantId: string
  name: string
  permissions?: Permission[]
}

export interface Permission {
  platform: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

export interface AuthState {
  user: User | null
  loading: boolean
}

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOEhxiMp1wqUmYZdx3kMCgkGRMHGdSTTG4YQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth state change listener
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Supabase auth event:', event, session?.user?.email)
    
    if (session?.user) {
      try {
        // Get user profile from database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (error) {
          console.warn('⚠️ Profile not found, using metadata:', error)
        }
        
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          role: (profile?.role || session.user.user_metadata?.role || 'creator') as User['role'],
          tenantId: profile?.org_id || session.user.user_metadata?.org_id || '00000000-0000-0000-0000-000000000001',
          name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        }
        
        callback(user)
      } catch (error) {
        console.error('❌ Error creating user object:', error)
        callback(null)
      }
    } else {
      callback(null)
    }
  })
}

// Role permissions
const ROLE_PERMISSIONS = {
  admin: ["read", "write", "delete", "manage_users", "manage_settings"],
  manager: ["read", "write", "manage_campaigns"],
  analyst: ["read", "create_reports"],
  creator: ["read", "create_content"],
}

export const authService = {
  async signIn(email: string, password: string): Promise<User> {
    console.log('🔐 Attempting login with:', email)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('❌ Supabase auth error:', error.message)
        throw new Error(error.message)
      }
      
      if (!data.user) {
        throw new Error('No user returned from authentication')
      }
      
      console.log('✅ Authentication successful:', data.user.email)
      
      // Extract user info from metadata
      const metadata = data.user.user_metadata || {}
      const role = metadata.role || 'creator'
      const fullName = metadata.full_name || data.user.email?.split('@')[0] || 'User'
      
      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        role: role as User['role'],
        tenantId: metadata.org_id || '00000000-0000-0000-0000-000000000001',
        name: fullName
      }
      
      console.log('👤 Created user object:', user)
      return user
      
    } catch (error) {
      console.error('💥 Sign in error:', error)
      throw error
    }
  },

  async signOut(): Promise<void> {
    console.log('🚪 Signing out...')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('❌ Sign out error:', error.message)
      throw error
    }
    console.log('✅ Signed out successfully')
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Get session error:', error.message)
        return null
      }
      
      if (!session?.user) {
        console.log('ℹ️  No active session found')
        return null
      }
      
      console.log('✅ Found active session for:', session.user.email)
      
      // Extract user info from metadata
      const metadata = session.user.user_metadata || {}
      const role = metadata.role || 'creator'
      const fullName = metadata.full_name || session.user.email?.split('@')[0] || 'User'
      
      const user: User = {
        id: session.user.id,
        email: session.user.email!,
        role: role as User['role'],
        tenantId: metadata.org_id || '00000000-0000-0000-0000-000000000001',
        name: fullName
      }
      
      return user
      
    } catch (error) {
      console.error('💥 Get current user error:', error)
      return null
    }
  },

  hasRole(user: User | null, role: string): boolean {
    return user?.role === role
  },

  hasPermission(user: User | null, permission: string): boolean {
    if (!user) return false
    const permissions = ROLE_PERMISSIONS[user.role] || []
    return permissions.includes(permission)
  },

  canAccessPlatform(user: User | null, platform: string): boolean {
    if (!user) return false
    
    // Role-based platform access
    switch (user.role) {
      case "admin":
        return true // Admin can access everything
      case "manager":
        return ["spotify", "soundcloud", "youtube", "instagram"].includes(platform)
      case "analyst":
        return ["spotify", "soundcloud"].includes(platform)
      case "creator":
        return platform === "spotify"
      default:
        return false
    }
  },

  // Admin functions
  async updateUserRole(userId: string, newRole: string): Promise<void> {
    // This would typically be handled by admin API
    throw new Error('Admin functions should use the admin API endpoints')
  },

  async getOrgUsers(orgId: string): Promise<User[]> {
    // This would typically be handled by admin API
    throw new Error('Admin functions should use the admin API endpoints')
  }
}
