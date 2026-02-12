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

/** POST /api/admin/users/backfill-passwords — Set and store passwords for admin/operator/vendor users that don't have one in profiles. */
export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 });
    }
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const supabaseAdmin = getAdminClient();
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some((r: { role: string }) => r.role === 'admin')) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    // Get all admin/operator/vendor user ids, then filter to those without stored password in profiles
    const { data: roleRows } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'operator', 'vendor']);
    const userIds = [...new Set((roleRows || []).map((r: { user_id: string }) => r.user_id))];
    if (userIds.length === 0) {
      return NextResponse.json({ backfilled: [], message: 'No admin/operator/vendor users' });
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, metadata')
      .in('id', userIds);
    const hasPassword = new Set(
      (profiles || []).filter((p: any) => p.metadata?.admin_set_password).map((p: any) => p.id)
    );

    const { data: userRows } = await supabaseAdmin.from('users').select('id, email').in('id', userIds);
    const toBackfill = (userRows || []).filter((u: { id: string }) => !hasPassword.has(u.id));

    const backfilled: Array<{ email: string; password: string }> = [];

    for (const row of toBackfill) {
      const { data: authUser, error: getErr } = await supabaseAdmin.auth.admin.getUserById(row.id);
      if (getErr || !authUser?.user) continue; // skip if not in Auth
      const password = generatePassword();
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(row.id, { password });
      if (updateErr) continue;
      const au = authUser.user;
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('metadata')
        .eq('id', row.id)
        .maybeSingle();
      const metadata = { ...(existingProfile?.metadata || {}), admin_set_password: password };
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ metadata })
        .eq('id', row.id);
      if (profileErr) {
        await supabaseAdmin.from('profiles').upsert({
          id: row.id,
          email: au.email ?? row.email ?? '',
          name: (au.user_metadata?.name ?? au.user_metadata?.full_name ?? row.email ?? '') as string,
          metadata,
        }, { onConflict: 'id' });
      }
      backfilled.push({ email: row.email || row.id, password });
    }

    return NextResponse.json({
      backfilled,
      message: backfilled.length ? `Set and stored passwords for ${backfilled.length} user(s).` : 'No users needed a password (all already had one in profiles).',
    });
  } catch (e) {
    console.error('backfill-passwords error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 });
  }
}
