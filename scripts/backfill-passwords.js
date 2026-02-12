/**
 * One-time backfill: set and store passwords for admin/operator/vendor users
 * that don't have profiles.metadata.admin_set_password.
 * Run from repo root (loads apps/frontend/.env.local if present):
 *   node scripts/backfill-passwords.js
 */
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', 'apps', 'frontend', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

async function main() {
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: roleRows } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'operator', 'vendor']);
  const userIds = [...new Set((roleRows || []).map((r) => r.user_id))];
  if (userIds.length === 0) {
    console.log('No admin/operator/vendor users found.');
    return;
  }

  const { data: profiles } = await supabase.from('profiles').select('id, metadata').in('id', userIds);
  const hasPassword = new Set((profiles || []).filter((p) => p.metadata?.admin_set_password).map((p) => p.id));

  const { data: userRows } = await supabase.from('users').select('id, email').in('id', userIds);
  const toBackfill = (userRows || []).filter((u) => !hasPassword.has(u.id));

  if (toBackfill.length === 0) {
    console.log('All admin/operator/vendor users already have a stored password.');
    return;
  }

  console.log('Backfilling passwords for:', toBackfill.map((u) => u.email).join(', '));

  for (const row of toBackfill) {
    const { data: authUser, error: getErr } = await supabase.auth.admin.getUserById(row.id);
    if (getErr || !authUser?.user) {
      console.warn('Skip (not in Auth):', row.email);
      continue;
    }
    const password = generatePassword();
    const { error: updateErr } = await supabase.auth.admin.updateUserById(row.id, { password });
    if (updateErr) {
      console.warn('Skip (auth update failed):', row.email, updateErr.message);
      continue;
    }
    const au = authUser.user;
    const { data: existingProfile } = await supabase.from('profiles').select('metadata').eq('id', row.id).maybeSingle();
    const metadata = { ...(existingProfile?.metadata || {}), admin_set_password: password };
    const { error: profileErr } = await supabase.from('profiles').update({ metadata }).eq('id', row.id);
    if (profileErr) {
      await supabase.from('profiles').upsert({
        id: row.id,
        email: au.email ?? row.email ?? '',
        name: (au.user_metadata?.name ?? au.user_metadata?.full_name ?? row.email ?? ''),
        metadata,
      }, { onConflict: 'id' });
    }
    console.log(row.email, '->', password);
  }

  console.log('Done. Refresh User Management in the app to see passwords.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
