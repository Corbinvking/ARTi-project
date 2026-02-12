/**
 * Salespeople Direct Database Import Script
 * 
 * Connects directly to PostgreSQL and imports salespeople from CSV.
 * Creates auth users + salespeople records + permissions in one shot.
 * 
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:port/db" npx tsx scripts/import-salespeople.ts [options]
 * 
 *   Options:
 *     --dry-run        Preview what would happen without writing
 *     --csv <path>     Path to CSV file (default: auto-detect in Downloads)
 *     --skip-inactive  Skip importing inactive salespeople
 * 
 * If no DATABASE_URL is provided, it will try to read from apps/api/.env
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Client } = pg;

// ============================================================================
// Configuration
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_INACTIVE = process.argv.includes('--skip-inactive');
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  
  // Try to load from .env files
  const envPaths = [
    path.join(process.cwd(), 'apps', 'api', '.env'),
    path.join(process.cwd(), '.env'),
  ];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^DATABASE_URL=(.+)$/m);
      if (match) return match[1].trim();
    }
  }
  
  console.error('❌ DATABASE_URL not found.');
  console.error('   Provide it as an environment variable or in apps/api/.env');
  console.error('   Example: DATABASE_URL="postgresql://user:pass@host:5432/postgres" npx tsx scripts/import-salespeople.ts');
  process.exit(1);
}

function getCSVPath(): string {
  const csvFlagIndex = process.argv.indexOf('--csv');
  if (csvFlagIndex !== -1 && process.argv[csvFlagIndex + 1]) {
    return process.argv[csvFlagIndex + 1];
  }
  
  const possiblePaths = [
    path.join(process.cwd(), 'Salespeople-All Salespeople.csv'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'Salespeople-All Salespeople.csv'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  
  console.error('❌ CSV file not found. Specify with --csv flag');
  process.exit(1);
}

// ============================================================================
// Password Generator (generates bcrypt-compatible hashes)
// ============================================================================

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let password = '';
  for (let i = 0; i < 14; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================================================
// Types
// ============================================================================

interface CSVRow {
  Name: string;
  Email: string;
  Notes: string;
  Status: string;
}

interface SalespersonToImport {
  name: string;
  email: string | null;
  status: string;
  notes: string;
  isSharedAccount: boolean;
}

interface ImportResult {
  name: string;
  email: string | null;
  status: string;
  action: 'created' | 'skipped_existing' | 'skipped_no_email' | 'skipped_duplicate' | 'skipped_inactive' | 'error';
  tempPassword?: string;
  error?: string;
}

// ============================================================================
// Main Import
// ============================================================================

async function importSalespeople() {
  const dbUrl = getDatabaseUrl();
  const csvPath = getCSVPath();
  
  console.log(`\n📂 CSV: ${csvPath}`);
  console.log(`🗄️  DB:  ${dbUrl.replace(/:[^:@]+@/, ':***@')}`); // mask password
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no database writes\n');
  }

  // Parse CSV (strip BOM if present)
  const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
  const rows: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  console.log(`📊 Found ${rows.length} rows in CSV\n`);

  // Deduplicate
  const emailsSeen = new Set<string>();
  const salespeopleToImport: SalespersonToImport[] = [];

  for (const row of rows) {
    const name = (row.Name || '').trim();
    const email = (row.Email || '').trim().toLowerCase() || null;
    const status = (row.Status || 'Active').trim();
    const notes = (row.Notes || '').trim();
    const isSharedAccount = name.includes('/');

    if (!name) continue;

    if (email && emailsSeen.has(email)) {
      console.log(`  ⚠️  Duplicate email skipped: ${email} (${name})`);
      continue;
    }
    if (email) emailsSeen.add(email);

    salespeopleToImport.push({ name, email, status, notes, isSharedAccount });
  }

  const withEmail = salespeopleToImport.filter(s => s.email);
  const withoutEmail = salespeopleToImport.filter(s => !s.email);
  console.log(`👥 ${salespeopleToImport.length} unique salespeople:`);
  console.log(`   With email: ${withEmail.length} | Without: ${withoutEmail.length}`);
  console.log(`   Active: ${salespeopleToImport.filter(s => s.status === 'Active').length}`);
  console.log(`   Inactive: ${salespeopleToImport.filter(s => s.status === 'Inactive').length}`);
  console.log(`   Pending: ${salespeopleToImport.filter(s => s.status === 'Pending').length}\n`);

  // Connect to database (skip for dry-run if no DB available)
  let client: InstanceType<typeof Client> | null = null;
  const existingEmailMap = new Map<string, string>();

  if (!DRY_RUN) {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    console.log('✅ Connected to database\n');

    // Ensure pgcrypto extension (needed for password hashing)
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    // Check existing auth users
    const { rows: existingUsers } = await client.query(`SELECT id, email FROM auth.users`);
    for (const u of existingUsers) {
      if (u.email) existingEmailMap.set(u.email.toLowerCase(), u.id);
    }
    console.log(`📋 Found ${existingUsers.length} existing auth users\n`);

    // Run the migration (idempotent)
    console.log('🔧 Running salespeople table enhancements...');
    await client.query(`ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS auth_user_id UUID`);
    await client.query(`ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active'`);
    await client.query(`ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS notes TEXT`);
    console.log('   Done.\n');
  } else {
    console.log('⏭️  Skipping DB connection (dry-run)\n');
  }

  // Process each salesperson
  const results: ImportResult[] = [];
  const credentials: { name: string; email: string; password: string }[] = [];

  for (const sp of salespeopleToImport) {
    const result: ImportResult = { name: sp.name, email: sp.email, status: sp.status, action: 'created' };

    if (SKIP_INACTIVE && sp.status === 'Inactive') {
      result.action = 'skipped_inactive';
      results.push(result);
      console.log(`  ⏭️  Skip inactive: ${sp.name}`);
      continue;
    }

    // No email — just create salespeople record
    if (!sp.email) {
      result.action = 'skipped_no_email';
      if (!DRY_RUN && client) {
        await client.query(`
          INSERT INTO public.salespeople (org_id, name, status, notes, is_active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [DEFAULT_ORG_ID, sp.name, sp.status, sp.notes || null, sp.status === 'Active']);
      }
      results.push(result);
      console.log(`  📋 No email: ${sp.name} — record only`);
      continue;
    }

    // Check if user already exists
    const existingUserId = existingEmailMap.get(sp.email);
    if (existingUserId) {
      result.action = 'skipped_existing';
      if (!DRY_RUN && client) {
        // Link existing auth user to salespeople record
        await client.query(`
          INSERT INTO public.salespeople (org_id, name, email, auth_user_id, status, notes, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email) DO UPDATE SET
            auth_user_id = EXCLUDED.auth_user_id,
            status = EXCLUDED.status,
            notes = COALESCE(EXCLUDED.notes, salespeople.notes),
            is_active = EXCLUDED.is_active
        `, [DEFAULT_ORG_ID, sp.name, sp.email, existingUserId, sp.status, sp.notes || null, sp.status === 'Active']);
      }
      results.push(result);
      console.log(`  ✅ Existing user: ${sp.name} (${sp.email}) — linked`);
      continue;
    }

    // Create new auth user
    const tempPassword = generateTempPassword();
    result.tempPassword = tempPassword;

    if (DRY_RUN) {
      credentials.push({ name: sp.name, email: sp.email, password: tempPassword });
      results.push(result);
      console.log(`  🆕 Would create: ${sp.name} (${sp.email})`);
      continue;
    }

    try {
      // Begin transaction for each user
      await client!.query('BEGIN');

      // 1. Create auth user with bcrypt password hash
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();
      const instanceId = '00000000-0000-0000-0000-000000000000';
      
      const userMetadata = JSON.stringify({
        full_name: sp.name,
        name: sp.name,
        role: 'sales',
        org_id: DEFAULT_ORG_ID,
        org_name: 'ARTi Marketing',
        email_verified: true,
      });

      await client!.query(`
        INSERT INTO auth.users (
          id, instance_id, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_user_meta_data, raw_app_meta_data,
          aud, role, confirmation_token, recovery_token,
          is_super_admin
        ) VALUES (
          $1, $2, $3, crypt($4, gen_salt('bf')),
          $5, $5, $5,
          $6::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
          'authenticated', 'authenticated', '', '',
          false
        )
      `, [userId, instanceId, sp.email, tempPassword, now, userMetadata]);

      // 2. Create auth identity
      await client!.query(`
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id,
          created_at, updated_at, last_sign_in_at
        ) VALUES (
          $1, $1, jsonb_build_object('sub', $1::text, 'email', $2, 'email_verified', true),
          'email', $2, $3, $3, $3
        )
      `, [userId, sp.email, now]);

      // 3. Create profile
      await client!.query(`
        INSERT INTO public.profiles (id, email, name, role, metadata)
        VALUES ($1, $2, $3, 'sales', '{"imported_from": "csv"}'::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role
      `, [userId, sp.email, sp.name]);

      // 4. Create salespeople record
      await client!.query(`
        INSERT INTO public.salespeople (org_id, name, email, auth_user_id, status, notes, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
          auth_user_id = EXCLUDED.auth_user_id,
          status = EXCLUDED.status,
          notes = COALESCE(EXCLUDED.notes, salespeople.notes),
          is_active = EXCLUDED.is_active
      `, [DEFAULT_ORG_ID, sp.name, sp.email, userId, sp.status, sp.notes || null, sp.status === 'Active']);

      // 5. Create permissions (all platforms for sales)
      const platforms = ['dashboard', 'instagram', 'spotify', 'youtube', 'soundcloud'];
      for (const platform of platforms) {
        await client!.query(`
          INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
          VALUES ($1, $2, true, true, false)
          ON CONFLICT DO NOTHING
        `, [userId, platform]);
      }

      await client!.query('COMMIT');
      
      credentials.push({ name: sp.name, email: sp.email, password: tempPassword });
      results.push(result);
      console.log(`  ✅ Created: ${sp.name} (${sp.email})`);

    } catch (error: any) {
      await client!.query('ROLLBACK');
      result.action = 'error';
      result.error = error.message;
      results.push(result);
      console.error(`  ❌ Error: ${sp.name} (${sp.email}): ${error.message}`);
    }
  }

  // Close connection
  if (client) await client.end();

  // =========================================================================
  // Summary
  // =========================================================================
  
  const created = results.filter(r => r.action === 'created');
  const linked = results.filter(r => r.action === 'skipped_existing');
  const noEmail = results.filter(r => r.action === 'skipped_no_email');
  const inactive = results.filter(r => r.action === 'skipped_inactive');
  const errors = results.filter(r => r.action === 'error');

  console.log('\n' + '='.repeat(70));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(70));
  console.log(`  ✅ Created (new login):  ${created.length}`);
  console.log(`  🔗 Linked (existing):    ${linked.length}`);
  console.log(`  📋 No email (record):    ${noEmail.length}`);
  console.log(`  ⏭️  Skipped inactive:     ${inactive.length}`);
  console.log(`  ❌ Errors:               ${errors.length}`);
  console.log(`  ─────────────────────────────`);
  console.log(`  📊 Total:                ${results.length}`);

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(e => console.log(`   ${e.name} (${e.email}): ${e.error}`));
  }

  // Credentials output
  if (credentials.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🔐 LOGIN CREDENTIALS');
    console.log('='.repeat(70));
    console.log('⚠️  Users should change password on first login.\n');

    const maxName = Math.max(...credentials.map(c => c.name.length));
    const maxEmail = Math.max(...credentials.map(c => c.email.length));

    console.log(`  ${'Name'.padEnd(maxName)}  ${'Email'.padEnd(maxEmail)}  Password`);
    console.log(`  ${'─'.repeat(maxName)}  ${'─'.repeat(maxEmail)}  ${'─'.repeat(14)}`);
    credentials.forEach(c => {
      console.log(`  ${c.name.padEnd(maxName)}  ${c.email.padEnd(maxEmail)}  ${c.password}`);
    });

    // Save credentials CSV
    if (!DRY_RUN) {
      const credPath = path.join(process.cwd(), `salespeople-credentials-${Date.now()}.csv`);
      const csv = 'Name,Email,Temporary Password,Status\n' +
        credentials.map(c => {
          const sp = salespeopleToImport.find(s => s.email === c.email);
          return `"${c.name}","${c.email}","${c.password}","${sp?.status || 'Active'}"`;
        }).join('\n');
      fs.writeFileSync(credPath, csv);
      console.log(`\n📄 Credentials saved: ${credPath}`);
      console.log('   ⚠️  DELETE this file after distributing!');
    }
  }

  console.log('\n✨ Done!\n');
}

// ============================================================================
// Run
// ============================================================================

importSalespeople().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
