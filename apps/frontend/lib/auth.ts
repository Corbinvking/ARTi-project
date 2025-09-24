// Real Supabase auth service
import { createClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  role: "admin" | "manager" | "sales" | "vendor"
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
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

// Auth state change listener with debounce
let authChangeTimeout: NodeJS.Timeout | null = null
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Supabase auth event:', event, session?.user?.email)
    
    // Debounce auth changes to prevent loops
    if (authChangeTimeout) {
      clearTimeout(authChangeTimeout)
    }
    
    authChangeTimeout = setTimeout(async () => {
    
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
        
        // Get user permissions via secure API endpoint
        let permissions: Permission[] = []
        try {
          console.log('🔍 Loading permissions for user:', session.user.id)
          
          // Use fetch to call our secure API endpoint
          const response = await fetch('/api/auth/permissions', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            permissions = data.permissions || []
            console.log('✅ Loaded permissions for user:', session.user.email, permissions.length, 'permissions')
            permissions.forEach(p => console.log('  -', p.platform, 'read:', p.can_read))
          } else {
            console.warn('⚠️ Failed to load permissions via API:', response.status, response.statusText)
          }
        } catch (error) {
          console.warn('⚠️ Permission loading failed, continuing without permissions:', error instanceof Error ? error.message : String(error))
        }
        
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          role: (profile?.role || session.user.user_metadata?.role || 'creator') as User['role'],
          tenantId: profile?.org_id || session.user.user_metadata?.org_id || '00000000-0000-0000-0000-000000000001',
          name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          permissions: permissions
        }
        
        callback(user)
      } catch (error) {
        console.error('❌ Error creating user object:', error)
        callback(null)
      }
    } else {
      callback(null)
    }
    }, 500) // 500ms debounce
  })
}

// Role permissions (legacy - now using database permissions)
const ROLE_PERMISSIONS = {
  admin: ["read", "write", "delete", "manage_users", "manage_settings"],
  manager: ["read", "write", "manage_campaigns"],
  sales: ["read", "write", "create_campaigns"],
  vendor: ["read", "create_content"],
}

// Function to refresh permissions for current user
export async function refreshUserPermissions(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    try {
      const response = await fetch('/api/auth/permissions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔄 Refreshed permissions:', data.permissions?.length || 0)
        
        // Trigger auth state change to update UI
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          supabase.auth.onAuthStateChange(() => {}) // Trigger refresh
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to refresh permissions:', error)
    }
  }
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
      
      // Permissions will be loaded separately via onAuthStateChange
      let permissions: Permission[] = []
      
      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        role: role as User['role'],
        tenantId: metadata.org_id || '00000000-0000-0000-0000-000000000001',
        name: fullName,
        permissions: permissions
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
    
    // Use database permissions if available
    if (user.permissions && user.permissions.length > 0) {
      const permission = user.permissions.find(p => p.platform === platform)
      return permission?.can_read || false
    }
    
    // Fallback role-based platform access (legacy)
    switch (user.role) {
      case "admin":
        return true // Admin can access everything
      case "manager":
        return ["dashboard", "spotify", "soundcloud", "youtube", "instagram"].includes(platform)
      case "sales":
        return ["dashboard", "spotify", "youtube", "instagram"].includes(platform)
      case "vendor":
        return ["dashboard", "spotify", "soundcloud"].includes(platform)
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
