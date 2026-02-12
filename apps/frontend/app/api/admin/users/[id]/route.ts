import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// PUT /api/admin/users/[id] — Update user (name, role, password)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;
    const body = await request.json().catch(() => ({}));
    const { name, role, password } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    // Try to get user from Auth (may 404 if API uses different Supabase than DB)
    const { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    const inAuth = !userError && !!existingUser?.user;

    if (inAuth) {
      // Update Auth user when present
      const updatePayload: any = {};
      const metadataUpdates: any = {};
      if (name) {
        metadataUpdates.full_name = name;
        metadataUpdates.name = name;
      }
      if (role) metadataUpdates.role = role;
      if (password) {
        updatePayload.password = password;
        metadataUpdates.admin_set_password = password;
      }
      if (Object.keys(metadataUpdates).length > 0) {
        updatePayload.user_metadata = { ...(existingUser?.user?.user_metadata || {}), ...metadataUpdates };
      }
      if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
        if (updateError) {
          console.error('Error updating auth user:', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }
    }

    // Always update public.users and profiles (so Edit works even when Auth 404)
    if (name) {
      await supabaseAdmin.from('users').update({ full_name: name }).eq('id', userId);
    }

    const profileUpdates: any = {};
    if (name) profileUpdates.name = name;
    if (role) profileUpdates.role = role;
    if (password) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('metadata')
        .eq('id', userId)
        .maybeSingle();
      profileUpdates.metadata = {
        ...(existingProfile?.metadata || {}),
        admin_set_password: password,
      };
    }
    if (Object.keys(profileUpdates).length > 0) {
      await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', userId);
    }

    if (role) {
      const roleMap: Record<string, string> = {
        admin: 'admin', manager: 'manager', sales: 'salesperson',
        salesperson: 'salesperson', vendor: 'vendor', operator: 'operator', user: 'user',
      };
      const dbRole = roleMap[role] || role;
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
      await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: dbRole });
    }

    return NextResponse.json({
      message: inAuth
        ? 'User updated successfully'
        : 'Name, role, and displayed password updated. Login password was not changed (user not found in Auth for this deployment).',
      userId,
      updated: { name, role, passwordChanged: !!password },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    // Delete permissions, roles, profiles first
    await supabaseAdmin.from('user_permissions').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    await supabaseAdmin.from('vendor_users').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.from('salespeople').update({ auth_user_id: null }).eq('auth_user_id', userId);
    await supabaseAdmin.from('users').delete().eq('id', userId);

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'User deleted successfully', userId });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
