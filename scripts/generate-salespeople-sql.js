// Generates a SQL file to import salespeople directly into PostgreSQL
// Run: node scripts/generate-salespeople-sql.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');

const csvPath = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'Salespeople-All Salespeople.csv');
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const INSTANCE_ID = '00000000-0000-0000-0000-000000000000';

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

function esc(s) {
  return (s || '').replace(/'/g, "''");
}

// Parse CSV
const csv = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

// Deduplicate
const emailsSeen = new Set();
const people = [];
for (const row of rows) {
  const name = (row.Name || '').trim();
  const email = (row.Email || '').trim().toLowerCase();
  const status = (row.Status || 'Active').trim();
  const notes = (row.Notes || '').trim();
  if (!name) continue;
  if (email && emailsSeen.has(email)) continue;
  if (email) emailsSeen.add(email);
  people.push({ name, email: email || null, status, notes });
}

// Build SQL
const lines = [];
lines.push('-- ==========================================================');
lines.push('-- Salespeople Import - Generated ' + new Date().toISOString());
lines.push('-- ==========================================================');
lines.push('');
lines.push('-- pgcrypto already installed on this database');
lines.push('');
lines.push('-- Ensure salespeople table columns exist');
lines.push('ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS auth_user_id UUID;');
lines.push('ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT \'Active\';');
lines.push('ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS notes TEXT;');
lines.push('');

const credentials = [];
const platforms = ['dashboard', 'instagram', 'spotify', 'youtube', 'soundcloud'];

for (const p of people) {
  if (!p.email) {
    lines.push('-- ' + p.name + ' (no email - salespeople record only)');
    lines.push(`INSERT INTO public.salespeople (org_id, name, status, notes, is_active)`);
    lines.push(`VALUES ('${DEFAULT_ORG_ID}', '${esc(p.name)}', '${esc(p.status)}', ${p.notes ? "'" + esc(p.notes) + "'" : 'NULL'}, ${p.status === 'Active'})`);
    lines.push(`ON CONFLICT DO NOTHING;`);
    lines.push('');
    continue;
  }

  const pw = genPassword();
  const uid = crypto.randomUUID();
  const now = new Date().toISOString();
  const meta = JSON.stringify({
    full_name: p.name,
    name: p.name,
    role: 'sales',
    org_id: DEFAULT_ORG_ID,
    org_name: 'ARTi Marketing',
    email_verified: true,
  }).replace(/'/g, "''");

  lines.push('-- --------------------------------------------------------');
  lines.push(`-- ${p.name} (${p.email})`);
  lines.push('-- --------------------------------------------------------');
  lines.push('DO $$');
  lines.push('BEGIN');
  lines.push(`  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '${p.email}') THEN`);
  lines.push('');
  lines.push('    -- Create auth user');
  lines.push(`    INSERT INTO auth.users (`);
  lines.push(`      id, instance_id, email, encrypted_password,`);
  lines.push(`      email_confirmed_at, created_at, updated_at,`);
  lines.push(`      raw_user_meta_data, raw_app_meta_data,`);
  lines.push(`      aud, role, confirmation_token, recovery_token, is_super_admin`);
  lines.push(`    ) VALUES (`);
  lines.push(`      '${uid}', '${INSTANCE_ID}', '${p.email}',`);
  lines.push(`      crypt('${pw}', gen_salt('bf')),`);
  lines.push(`      '${now}', '${now}', '${now}',`);
  lines.push(`      '${meta}'::jsonb,`);
  lines.push(`      '{"provider":"email","providers":["email"]}'::jsonb,`);
  lines.push(`      'authenticated', 'authenticated', '', '', false`);
  lines.push(`    );`);
  lines.push('');
  lines.push('    -- Create auth identity');
  lines.push(`    INSERT INTO auth.identities (`);
  lines.push(`      id, user_id, identity_data, provider, provider_id,`);
  lines.push(`      created_at, updated_at, last_sign_in_at`);
  lines.push(`    ) VALUES (`);
  lines.push(`      '${uid}', '${uid}',`);
  lines.push(`      jsonb_build_object('sub', '${uid}', 'email', '${p.email}', 'email_verified', true),`);
  lines.push(`      'email', '${p.email}',`);
  lines.push(`      '${now}', '${now}', '${now}'`);
  lines.push(`    );`);
  lines.push('');
  lines.push('    -- Create profile');
  lines.push(`    INSERT INTO public.profiles (id, email, name, role)`);
  lines.push(`    VALUES ('${uid}', '${p.email}', '${esc(p.name)}', 'sales')`);
  lines.push(`    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;`);
  lines.push('');
  lines.push('    -- Create permissions (all platforms)');
  for (const plat of platforms) {
    lines.push(`    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)`);
    lines.push(`    VALUES ('${uid}', '${plat}', true, true, false) ON CONFLICT DO NOTHING;`);
  }
  lines.push('');
  lines.push(`    RAISE NOTICE 'Created user: ${p.name} (${p.email})';`);
  lines.push('  ELSE');
  lines.push(`    RAISE NOTICE 'Skipped existing: ${p.name} (${p.email})';`);
  lines.push('  END IF;');
  lines.push('END $$;');
  lines.push('');
  lines.push(`-- Salespeople record (links to auth user)`);
  lines.push(`INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)`);
  lines.push(`VALUES ('${DEFAULT_ORG_ID}', '${esc(p.name)}', '${p.email}', '${esc(p.status)}', ${p.notes ? "'" + esc(p.notes) + "'" : 'NULL'}, ${p.status === 'Active'},`);
  lines.push(`  (SELECT id FROM auth.users WHERE email = '${p.email}'))`);
  lines.push(`ON CONFLICT (email) DO UPDATE SET`);
  lines.push(`  auth_user_id = EXCLUDED.auth_user_id,`);
  lines.push(`  status = EXCLUDED.status,`);
  lines.push(`  is_active = EXCLUDED.is_active;`);
  lines.push('');

  credentials.push({ name: p.name, email: p.email, password: pw, status: p.status });
}

lines.push('-- Verify results');
lines.push("SELECT name, email, status, is_active, auth_user_id IS NOT NULL as has_login FROM public.salespeople ORDER BY name;");
lines.push('');
lines.push('-- Import complete!');

// Write SQL file
const sqlPath = path.join(__dirname, 'import-salespeople.sql');
fs.writeFileSync(sqlPath, lines.join('\n'));

// Write credentials CSV
let credCsv = 'Name,Email,Temporary Password,Status\n';
credentials.forEach(c => {
  credCsv += `"${c.name}","${c.email}","${c.password}","${c.status}"\n`;
});
const credPath = path.join(__dirname, 'salespeople-credentials.csv');
fs.writeFileSync(credPath, credCsv);

// Output
console.log(`\nGenerated ${credentials.length} user accounts`);
console.log(`SQL file:         ${sqlPath}`);
console.log(`Credentials file: ${credPath}`);
console.log('');
console.log('Name            Email                                  Password');
console.log('──────────────  ─────────────────────────────────────  ────────────');
credentials.forEach(c => {
  console.log(`${c.name.padEnd(16)}${c.email.padEnd(39)}${c.password}`);
});
