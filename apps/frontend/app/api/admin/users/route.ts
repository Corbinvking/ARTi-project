import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('🔍 API Route - Admin Users GET request');
    console.log('🔧 Environment check:');
    console.log('  - NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('  - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'MISSING');
    
    // Create admin client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    // Get the auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('🔑 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    let authToken: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
      console.log('✅ Extracted token from Authorization header');
    }
    
    if (!authToken) {
      console.error('❌ No auth token found in Authorization header');
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 });
    }

    // Verify the token and get the user
    console.log('🔍 Verifying auth token...');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    console.log('✅ Token verified for user:', user.email, user.id);

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    console.log('📋 User roles:', userRoles, 'Error:', roleError);

    if (roleError || !userRoles?.some((r: any) => r.role === 'admin')) {
      console.error('❌ Access denied - not admin. Roles:', userRoles);
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('✅ Admin access granted');

    // Fetch all users using admin client
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Fetch roles and vendor associations for each user
    const usersWithData = await Promise.all(
      authUsers.users.map(async (authUser) => {
        // Get roles
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id);

        const userRoles = roles?.map((r: any) => r.role) || [];

        // Get vendor association if user has vendor role
        let vendorName: string | undefined;
        if (userRoles.includes('vendor')) {
          const { data: vendorMapping } = await supabaseAdmin
            .from('vendor_users')
            .select('vendors ( name )')
            .eq('user_id', authUser.id)
            .single();

          if (vendorMapping) {
            vendorName = (vendorMapping as any).vendors?.name;
          }
        }

        return {
          id: authUser.id,
          email: authUser.email || '',
          roles: userRoles,
          created_at: authUser.created_at,
          vendor_name: vendorName
        };
      })
    );

    return NextResponse.json({ users: usersWithData });
  } catch (error) {
    console.error('Unexpected error in users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

