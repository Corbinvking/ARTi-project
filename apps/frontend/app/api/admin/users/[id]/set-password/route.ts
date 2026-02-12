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

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// POST /api/admin/users/[id]/set-password — Generate or set password, store in Auth + profiles, return it
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set' },
        { status: 500 }
      );
    }

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!authToken) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError) {
      console.error('set-password auth getUser:', authError);
      return NextResponse.json({ error: authError.message || 'Invalid or expired session' }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    if (!roles?.some((r: { role: string }) => r.role === 'admin')) {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === 'string' && body.password.length > 0
      ? body.password
      : generatePassword();

    const { data: targetUser, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !targetUser?.user) {
      return NextResponse.json({ error: userErr?.message || 'User not found' }, { status: 404 });
    }

    const { error: updateAuth } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (updateAuth) {
      console.error('set-password auth update:', updateAuth);
      return NextResponse.json(
        { error: updateAuth.message || 'Failed to update password in auth' },
        { status: 500 }
      );
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .maybeSingle();

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        metadata: {
          ...(existingProfile?.metadata || {}),
          admin_set_password: password,
        },
      })
      .eq('id', userId);

    if (profileErr) {
      console.warn('set-password profile update:', profileErr);
      // If profile row doesn't exist, upsert with required columns (email NOT NULL)
      const u = targetUser.user;
      const { error: upsertErr } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: userId,
            email: u.email ?? '',
            name: (u.user_metadata?.name ?? u.user_metadata?.full_name ?? u.email ?? '') as string,
            metadata: { ...(existingProfile?.metadata || {}), admin_set_password: password },
          },
          { onConflict: 'id' }
        );
      if (upsertErr) console.warn('set-password profile upsert:', upsertErr);
    }

    return NextResponse.json({ password });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    console.error('set-password error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
