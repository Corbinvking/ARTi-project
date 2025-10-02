import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// Use the same Supabase instance as the main app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application': 'stream-strategist'
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
        'x-application': 'stream-strategist'
      }
    }
  })
}

export default supabase






