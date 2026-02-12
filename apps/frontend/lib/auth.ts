// Real Supabase auth service
import { createClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  role: "admin" | "manager" | "operator" | "sales" | "vendor" | "member"
  tenantId: string
  name: string
  permissions?: Permission[]
  isMember?: boolean  // Flag for SoundCloud members
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

// Supabase configuration - now uses environment variables only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOEhxiMp1wqUmYZdx3kMCgkGRMHGdSTTG4YQ'

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required. Please check your .env.local file.')
}
if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
        // Get user profile from database (use maybeSingle to avoid 406 errors)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
        
        if (error) {
          console.warn('⚠️ Profile query error:', error.message)
        } else if (!profile) {
          console.log('ℹ️ No profile found, using auth metadata')
        }
        
        // Skip external permissions API call - use role-based permissions instead
        // This avoids CORS issues and speeds up auth significantly
        let permissions: Permission[] = []
        console.log('ℹ️ Using role-based permissions for:', session.user.email)
        
        const userRole = (profile?.role || session.user.user_metadata?.role || 'creator') as User['role']
        const isMember = session.user.user_metadata?.is_member === true || userRole === 'member'
        
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          role: userRole,
          tenantId: profile?.org_id || session.user.user_metadata?.org_id || '00000000-0000-0000-0000-000000000001',
          name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          permissions: permissions,
          isMember: isMember
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
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["read", "write", "delete", "manage_users", "manage_settings"],
  manager: ["read", "write", "manage_campaigns"],
  operator: ["read", "write", "manage_campaigns", "submit_reports"],
  sales: ["read", "write", "create_campaigns"],
  vendor: ["read", "create_content"],
  member: ["read", "submit_tracks"],  // SoundCloud members
}

// Function to refresh permissions for current user (no-op - using role-based)
export async function refreshUserPermissions(): Promise<void> {
  // Using role-based permissions, no refresh needed
  console.log('ℹ️ Using role-based permissions, no refresh needed')
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
      const isMember = metadata.is_member === true || role === 'member'
      
      // Permissions will be loaded separately via onAuthStateChange
      let permissions: Permission[] = []
      
      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        role: role as User['role'],
        tenantId: metadata.org_id || '00000000-0000-0000-0000-000000000001',
        name: fullName,
        permissions: permissions,
        isMember: isMember
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
    try {
      // Check if there's an active session first
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('ℹ️  No active session to sign out from')
        // Clear any local storage anyway
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token')
        }
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Sign out error:', error.message)
        // Don't throw - just log and continue
        // Clear local storage manually if signOut fails
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token')
        }
        return
      }
      console.log('✅ Signed out successfully')
    } catch (error) {
      console.error('💥 Sign out error:', error)
      // Clear local storage manually as fallback
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token')
      }
    }
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
      const isMember = metadata.is_member === true || role === 'member'
      
      const user: User = {
        id: session.user.id,
        email: session.user.email!,
        role: role as User['role'],
        tenantId: metadata.org_id || '00000000-0000-0000-0000-000000000001',
        name: fullName,
        isMember: isMember
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
      case "operator":
        return ["dashboard", "spotify", "soundcloud", "youtube", "instagram", "operator"].includes(platform)
      case "sales":
        return ["dashboard", "spotify", "youtube", "instagram", "soundcloud"].includes(platform)
      case "vendor":
        return ["dashboard", "spotify", "soundcloud"].includes(platform)
      case "member":
        return ["soundcloud"].includes(platform) // Members only access SoundCloud portal
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
