import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create admin client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create client for checking current user's auth
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Verify the current user is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles?.some((r: any) => r.role === 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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

