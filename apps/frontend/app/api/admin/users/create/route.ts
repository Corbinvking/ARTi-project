import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, roles } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

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

    // Get the auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    let authToken: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    }
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 });
    }

    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles?.some((r: any) => r.role === 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Create user using admin client
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: roles?.[0] || 'vendor' // Store primary role in metadata
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Add roles to user_roles table
    if (roles && roles.length > 0 && data.user) {
      const roleInserts = roles.map((role: string) => ({
        user_id: data.user!.id,
        role: role as 'admin' | 'manager' | 'salesperson' | 'vendor'
      }));

      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert(roleInserts);

      if (roleInsertError) {
        console.error('Error inserting roles:', roleInsertError);
        // Don't fail the request if roles fail, user is already created
      }
    }

    // Also insert into public.users table
    if (data.user) {
      const { error: publicUserError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: email.split('@')[0],
          role: roles?.[0] || 'vendor'
        });

      if (publicUserError) {
        console.warn('Error inserting into public.users:', publicUserError);
        // Don't fail the request
      }
    }

    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error('Unexpected error in create user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

