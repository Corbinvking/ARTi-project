/**
 * Create SoundCloud Member Auth Accounts
 * 
 * This script creates Supabase auth accounts for Active SoundCloud members
 * and links them to their member records for portal access.
 * 
 * Usage:
 *   npx ts-node scripts/create-soundcloud-member-accounts.ts
 * 
 * Options:
 *   --dry-run     Preview what would be created without making changes
 *   --send-emails Send magic link emails to members (default: false)
 *   --limit N     Only process N members (for testing)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/production.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const sendEmails = args.includes('--send-emails');
const limitArg = args.findIndex(a => a === '--limit');
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) : undefined;

interface SoundCloudMember {
  id: string;
  name: string;
  primary_email: string;
  emails: string[];
  status: string;
  size_tier: string;
  followers: number;
  soundcloud_url?: string;
  soundcloud_followers?: number;
  families?: string[];
  influence_planner_status?: string;
  user_id?: string;
}

interface CreateResult {
  memberId: string;
  memberName: string;
  email: string;
  status: 'created' | 'linked' | 'skipped' | 'error';
  userId?: string;
  reason?: string;
}

async function getMembersNeedingAccounts(): Promise<SoundCloudMember[]> {
  console.log('\n📊 Fetching Active members without auth accounts...\n');
  
  // Get active members who don't have a user_id yet
  const { data: members, error } = await supabase
    .from('soundcloud_members')
    .select('*')
    .eq('status', 'active')
    .is('user_id', null)
    .order('name');
  
  if (error) {
    console.error('❌ Error fetching members:', error.message);
    throw error;
  }
  
  // Filter to members with valid emails
  const membersWithEmails = (members || []).filter(m => {
    const email = m.primary_email || (m.emails && m.emails[0]);
    return email && email.includes('@');
  });
  
  console.log(`Found ${membersWithEmails.length} Active members needing accounts`);
  
  return membersWithEmails;
}

async function checkExistingUser(email: string): Promise<string | null> {
  // Check if user already exists in auth.users
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.warn('⚠️  Could not check existing users:', error.message);
      return null;
    }
    
    // Type assertion for Supabase admin API response
    const users = (data?.users || []) as Array<{ id: string; email?: string }>;
    
    const existingUser = users.find(u => 
      u.email?.toLowerCase() === email.toLowerCase()
    );
    
    return existingUser?.id || null;
  } catch (e: any) {
    console.warn('⚠️  Error checking existing users:', e.message);
    return null;
  }
}

async function createMemberAccount(member: SoundCloudMember): Promise<CreateResult> {
  const email = member.primary_email || (member.emails && member.emails[0]);
  
  if (!email) {
    return {
      memberId: member.id,
      memberName: member.name,
      email: 'N/A',
      status: 'skipped',
      reason: 'No email address'
    };
  }
  
  try {
    // Check if user already exists
    const existingUserId = await checkExistingUser(email);
    
    if (existingUserId) {
      // Link existing user to member
      if (!isDryRun) {
        // Update member with user_id
        const { error: updateError } = await supabase
          .from('soundcloud_members')
          .update({ 
            user_id: existingUserId,
            influence_planner_status: 'invited'
          })
          .eq('id', member.id);
        
        if (updateError) throw updateError;
        
        // Create link in soundcloud_member_users
        const { error: linkError } = await supabase
          .from('soundcloud_member_users')
          .upsert({
            user_id: existingUserId,
            member_id: member.id
          }, { onConflict: 'member_id' });
        
        if (linkError && !linkError.message.includes('duplicate')) {
          console.warn(`⚠️  Link warning for ${member.name}:`, linkError.message);
        }
      }
      
      return {
        memberId: member.id,
        memberName: member.name,
        email,
        status: 'linked',
        userId: existingUserId,
        reason: 'Linked to existing user'
      };
    }
    
    // Create new auth user
    if (isDryRun) {
      return {
        memberId: member.id,
        memberName: member.name,
        email,
        status: 'created',
        reason: '[DRY RUN] Would create new account'
      };
    }
    
    // Generate a random password (user will reset via magic link)
    const tempPassword = `SC_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}!`;
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'member',
        is_member: true,
        full_name: member.name,
        member_id: member.id,
        member_data: {
          name: member.name,
          soundcloud_url: member.soundcloud_url,
          soundcloud_followers: member.soundcloud_followers,
          size_tier: member.size_tier,
          families: member.families
        }
      }
    });
    
    if (authError) {
      throw authError;
    }
    
    const newUserId = authData.user.id;
    
    // Update member with user_id
    const { error: updateError } = await supabase
      .from('soundcloud_members')
      .update({ 
        user_id: newUserId,
        influence_planner_status: 'invited'
      })
      .eq('id', member.id);
    
    if (updateError) {
      console.warn(`⚠️  Could not update member ${member.name}:`, updateError.message);
    }
    
    // Create link in soundcloud_member_users
    const { error: linkError } = await supabase
      .from('soundcloud_member_users')
      .insert({
        user_id: newUserId,
        member_id: member.id
      });
    
    if (linkError) {
      console.warn(`⚠️  Could not create link for ${member.name}:`, linkError.message);
    }
    
    // Optionally send magic link email
    if (sendEmails) {
      const { error: emailError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${process.env.FRONTEND_URL || 'https://app.artistinfluence.io'}/soundcloud/portal`
        }
      });
      
      if (emailError) {
        console.warn(`⚠️  Could not send email to ${email}:`, emailError.message);
      }
    }
    
    return {
      memberId: member.id,
      memberName: member.name,
      email,
      status: 'created',
      userId: newUserId
    };
    
  } catch (error: any) {
    return {
      memberId: member.id,
      memberName: member.name,
      email,
      status: 'error',
      reason: error.message
    };
  }
}

async function main() {
  console.log('🎵 SoundCloud Member Account Creator\n');
  console.log('=====================================');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  if (sendEmails) {
    console.log('📧 Email sending is ENABLED\n');
  }
  
  try {
    // Get members needing accounts
    let members = await getMembersNeedingAccounts();
    
    if (limit) {
      console.log(`\n⚠️  Limiting to first ${limit} members\n`);
      members = members.slice(0, limit);
    }
    
    if (members.length === 0) {
      console.log('\n✅ No Active members need accounts!');
      return;
    }
    
    console.log(`\n📝 Processing ${members.length} members...\n`);
    
    const results: CreateResult[] = [];
    
    for (const member of members) {
      const result = await createMemberAccount(member);
      results.push(result);
      
      const statusIcon = {
        created: '✅',
        linked: '🔗',
        skipped: '⏭️',
        error: '❌'
      }[result.status];
      
      console.log(`  ${statusIcon} ${result.memberName} (${result.email})`);
      if (result.reason) {
        console.log(`     ${result.reason}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log('\n=====================================');
    console.log('📊 Summary:\n');
    
    const created = results.filter(r => r.status === 'created').length;
    const linked = results.filter(r => r.status === 'linked').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    console.log(`  ✅ Created: ${created}`);
    console.log(`  🔗 Linked:  ${linked}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors:  ${errors}`);
    console.log(`  📊 Total:   ${results.length}`);
    
    if (errors > 0) {
      console.log('\n❌ Errors:');
      results
        .filter(r => r.status === 'error')
        .forEach(r => console.log(`  - ${r.memberName}: ${r.reason}`));
    }
    
    if (isDryRun) {
      console.log('\n🔍 This was a DRY RUN. Run without --dry-run to create accounts.');
    } else {
      console.log('\n✨ Member accounts created! They can now log in to the portal.');
      if (!sendEmails) {
        console.log('💡 Tip: Run with --send-emails to send magic link invitations.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

