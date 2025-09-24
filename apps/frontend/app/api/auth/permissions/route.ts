import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    // Import createClient here to avoid module issues
    const { createClient } = await import('@supabase/supabase-js')
    
    // Create a client with the user's token
    const token = authHeader.replace('Bearer ', '')
    const supabaseUser = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOEhxiMp1wqUmYZdx3kMCgkGRMHGdSTTG4YQ',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      )
    }

    // Use service role to get permissions (bypassing RLS issues)
    const supabaseAdmin = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    )

    // Get user permissions using service role
    const { data: permissions, error: permError } = await supabaseAdmin
      .from('user_permissions')
      .select('platform, can_read, can_write, can_delete')
      .eq('user_id', user.id)

    if (permError) {
      console.error('❌ Failed to load permissions for user:', user.email, permError)
      return NextResponse.json(
        { error: 'Failed to load permissions' },
        { status: 500 }
      )
    }

    console.log('✅ Loaded permissions for user:', user.email, permissions?.length || 0, 'permissions')

    return NextResponse.json({
      permissions: permissions || []
    })
    
  } catch (error) {
    console.error('❌ Permissions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
