import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// Use the same Supabase instance as the main app
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Using placeholders for build.')
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://placeholder.invalid'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application': 'seedstorm-builder'
    }
  }
})

// Helper function to get org-scoped client
export function createOrgScopedClient(orgId: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-org-id': orgId,
        'x-application': 'seedstorm-builder'
      }
    }
  })
}

export default supabase
