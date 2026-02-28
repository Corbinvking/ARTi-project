// Updated for Next.js unified dashboard integration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ✅ Use unified Supabase instance from environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Using placeholders for build.');
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://placeholder.invalid';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application': 'soundcloud-manager'
    }
  }
});

// ✅ Org-scoped client for multi-tenant functionality (optional)
export function createOrgScopedClient(orgId: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-org-id': orgId,
        'x-application': 'soundcloud-manager'
      }
    }
  });
}

export default supabase;

console.log('✅ SoundCloud Supabase client initialized');
