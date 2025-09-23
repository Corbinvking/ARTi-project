import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Proxying GET request to:', `${API_BASE_URL}/admin/users`)
    
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward any auth headers from the original request
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Backend error:', response.status, data)
      return NextResponse.json(
        { error: data.error || 'Failed to fetch users' },
        { status: response.status }
      )
    }

    console.log('✅ Successfully fetched users:', data.users?.length || 0)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role, permissions } = body
    
    console.log('🔄 Creating user directly via Supabase:', email, 'Role:', role)
    
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      )
    }

    // Import createClient here to avoid module issues
    const { createClient } = await import('@supabase/supabase-js')
    
    // Service role client for admin operations
    const supabaseAdmin = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    )

    // Create user in Supabase Auth
    const defaultOrgId = '00000000-0000-0000-0000-000000000001'
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: name,
        name: name,
        role: role, 
        org_id: defaultOrgId,
        org_name: 'ARTi Marketing Demo',
        email_verified: true
      }
    })

    if (createError) {
      console.error('❌ Error creating auth user:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }
    
    if (!authUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }
    
    console.log('✅ Created auth user:', authUser.user.id)
    
    // Create default permissions based on role or use provided permissions
    const getDefaultPermissions = (role: string) => {
      const platforms = ['dashboard', 'instagram', 'spotify', 'soundcloud', 'youtube']
      
      switch (role) {
        case 'admin':
          return platforms.map(platform => ({
            platform,
            can_read: true,
            can_write: true,
            can_delete: true
          }))
        case 'manager':
          return platforms.map(platform => ({
            platform,
            can_read: true,
            can_write: true,
            can_delete: false
          }))
        case 'sales':
          return [
            { platform: 'dashboard', can_read: true, can_write: true, can_delete: false },
            { platform: 'instagram', can_read: true, can_write: true, can_delete: false },
            { platform: 'spotify', can_read: true, can_write: true, can_delete: false }
          ]
        case 'vendor':
          return [
            { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
            { platform: 'spotify', can_read: true, can_write: false, can_delete: false },
            { platform: 'soundcloud', can_read: true, can_write: false, can_delete: false }
          ]
        default:
          return [
            { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
            { platform: 'spotify', can_read: true, can_write: false, can_delete: false }
          ]
      }
    }
    
    const userPermissions = permissions || getDefaultPermissions(role)
    
    // Insert user permissions
    if (userPermissions && userPermissions.length > 0) {
      const { error: permError } = await supabaseAdmin
        .from('user_permissions')
        .insert(
          userPermissions.map((perm: any) => ({
            user_id: authUser.user.id,
            platform: perm.platform,
            can_read: perm.can_read,
            can_write: perm.can_write,
            can_delete: perm.can_delete
          }))
        )
      
      if (permError) {
        console.warn('⚠️ Failed to create user permissions:', permError)
      } else {
        console.log('✅ Created user permissions:', userPermissions.length)
      }
    }
    
    const responseUser = {
      id: authUser.user.id,
      email: authUser.user.email,
      name: name,
      role: role,
      org_id: defaultOrgId,
      org_name: 'ARTi Marketing Demo',
      status: authUser.user.email_confirmed_at ? 'active' : 'pending',
      last_sign_in_at: authUser.user.last_sign_in_at,
      created_at: authUser.user.created_at,
      email_confirmed_at: authUser.user.email_confirmed_at,
      permissions: userPermissions
    }
    
    console.log('✅ Successfully created user:', responseUser.email)
    
    return NextResponse.json({
      message: 'User created successfully',
      user: responseUser
    })
    
  } catch (error) {
    console.error('❌ Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
