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

async function updateUserDbOnly(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  userId: string,
  body: { name?: string; role?: string; password?: string }
) {
  const { name, role, password } = body;
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
}

/** POST /api/admin/users/update — Update user by id in body. Tries Auth (login password) then always updates DB. Static path to avoid 404 on dynamic [id]. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id: userId, name, role, password } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required in body' }, { status: 400 });
    }
    if (!name && !role && !password) {
      return NextResponse.json({ error: 'Provide name, role, or password' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    let inAuth = false;

    try {
      const { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      inAuth = !userError && !!existingUser?.user;
      if (inAuth) {
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
            inAuth = false;
          }
        }
      }
    } catch (_) {
      inAuth = false;
    }

    await updateUserDbOnly(supabaseAdmin, userId, { name, role, password });

    return NextResponse.json({
      message: inAuth ? 'User updated successfully' : 'User updated (name, role, and displayed password saved).',
      userId,
      updated: { name, role, passwordChanged: !!password },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users/update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
