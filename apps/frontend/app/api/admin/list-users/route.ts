import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client for admin operations
const supabaseAdmin = createClient(
  'http://127.0.0.1:54321', // Direct URL since env vars aren't loading in API routes
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' // Real JWT service role token from kong.yml
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Admin: Listing users via service role...')
    
    // Get users from auth using service role client
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        { error: `Failed to load auth users: ${authError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Loaded auth users:', authUsers.users.length)

    // Get users with their permissions from the RBAC system
    let usersWithPermissions = []
    try {
      const { data, error: permError } = await supabaseAdmin
        .from('user_permissions_view')
        .select('*')
      
      if (permError) {
        console.warn('⚠️ Permissions view not found, using empty permissions:', permError.message)
      } else {
        usersWithPermissions = data || []
      }
    } catch (error) {
      console.warn('⚠️ Permissions system not ready, using empty permissions')
    }

    console.log('✅ Loaded permissions data:', usersWithPermissions?.length || 0)

    // Format users with role info and permissions
    const combinedUsers = authUsers.users.map(authUser => {
      const metadata = authUser.user_metadata || {}
      
      // Get role from metadata, fallback to email pattern  
      let role = metadata.role || 'creator'
      if (!metadata.role) {
        if (authUser.email?.includes('admin')) role = 'admin'
        else if (authUser.email?.includes('manager')) role = 'manager'
        else if (authUser.email?.includes('analyst')) role = 'analyst'
        else if (authUser.email?.includes('sales')) role = 'sales'
        else if (authUser.email?.includes('vendor')) role = 'vendor'
      }
      
      // Get permissions for this user
      const userPermissions = usersWithPermissions?.find(u => u.user_id === authUser.id)?.permissions || []
      
      return {
        id: authUser.id,
        email: authUser.email,
        name: metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Unknown',
        role: role as any,
        org_id: metadata.org_id || '00000000-0000-0000-0000-000000000001',
        org_name: 'ARTi Marketing Demo',
        status: authUser.email_confirmed_at ? 'active' : 'pending',
        last_sign_in_at: authUser.last_sign_in_at,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at,
        permissions: userPermissions
      }
    })

    console.log('✅ Combined user data:', combinedUsers.length)
    
    return NextResponse.json({ users: combinedUsers })
    
  } catch (error) {
    console.error('❌ Failed to load users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
