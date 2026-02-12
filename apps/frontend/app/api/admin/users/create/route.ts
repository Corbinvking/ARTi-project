import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, roles, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const fullName = name || email.split('@')[0];

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
    const primaryRole = roles?.[0] || 'vendor';
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: primaryRole,
        full_name: fullName,
        name: fullName,
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

    // Insert into public.users and upsert profiles (with password in metadata) using service role
    if (data.user) {
      const { error: publicUserError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: primaryRole
        });

      if (publicUserError) {
        console.warn('Error inserting into public.users:', publicUserError);
      }

      // Ensure profile exists with admin_set_password so admins can see it in User Management
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, metadata')
        .eq('id', data.user.id)
        .maybeSingle();

      const mergedMetadata = {
        ...(existingProfile?.metadata || {}),
        admin_set_password: password,
      };

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          name: fullName,
          role: primaryRole,
          metadata: mergedMetadata,
        }, { onConflict: 'id' });

      if (profileError) {
        console.warn('Error upserting profile (password visibility):', profileError);
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

