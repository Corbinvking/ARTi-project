#!/usr/bin/env node

/**
 * Fix client structure: extract proper names and emails
 */

const { createClient } = require('@supabase/supabase-js');

function extractEmail(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches || [];
}

function cleanClientName(name) {
  // Remove email addresses
  let cleaned = name.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
  
  // Remove dates like "9/18/2025 3:10pm"
  cleaned = cleaned.replace(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(am|pm)/gi, '');
  
  // Remove "checked" keywords
  cleaned = cleaned.replace(/\bchecked\b/gi, '');
  
  // Remove trailing commas and whitespace
  cleaned = cleaned.replace(/[,\s]+$/g, '');
  cleaned = cleaned.replace(/^[,\s]+/g, '');
  
  // Remove multiple commas
  cleaned = cleaned.replace(/,+/g, ',');
  
  // Remove leading/trailing commas
  cleaned = cleaned.replace(/^,|,$/g, '');
  
  // Trim
  cleaned = cleaned.trim();
  
  return cleaned || name; // Return original if cleaning results in empty
}

function isJunkClientName(name) {
  // Check if it's purely numeric
  if (/^\d+$/.test(name)) return true;
  
  // Check if it starts with a date
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(name)) return true;
  
  // Check if it's just commas
  if (/^[,\s]+$/.test(name)) return true;
  
  // Check if it's a sentence/instruction (contains "please", "let", etc.)
  const junkPhrases = [
    'please pitch',
    'let us know',
    'adn get the song',
    'dont need referral',
    'if not then go',
    'put clinet name',
    'but then the curator',
    'which is TBD',
    'put the set with',
    'start asap',
    'the curator I worked'
  ];
  
  const lowerName = name.toLowerCase();
  return junkPhrases.some(phrase => lowerName.includes(phrase));
}

async function fixClientStructure() {
  try {
    console.log('🔧 Fixing client structure...\n');

    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    console.log(`📊 Found ${clients.length} clients\n`);

    let updatedCount = 0;
    let deletedCount = 0;

    for (const client of clients) {
      const originalName = client.name;
      
      // Check if this is junk data
      if (isJunkClientName(originalName)) {
        console.log(`🗑️  Deleting junk client: "${originalName}"`);
        
        // First, unlink any campaigns
        await supabase
          .from('spotify_campaigns')
          .update({ client_id: null })
          .eq('client_id', client.id);
          
        await supabase
          .from('campaign_groups')
          .update({ client_id: null })
          .eq('client_id', client.id);
        
        // Delete the client
        await supabase
          .from('clients')
          .delete()
          .eq('id', client.id);
        
        deletedCount++;
        continue;
      }
      
      // Extract emails
      const emails = extractEmail(originalName);
      
      // Clean the name
      const cleanedName = cleanClientName(originalName);
      
      // Only update if something changed
      if (cleanedName !== originalName || emails.length > 0) {
        const updateData = {
          name: cleanedName
        };
        
        if (emails.length > 0) {
          updateData.emails = emails;
        }
        
        const { error: updateError } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', client.id);
        
        if (updateError) {
          console.warn(`⚠️  Error updating client "${originalName}": ${updateError.message}`);
        } else {
          console.log(`✅ Updated: "${originalName}" → "${cleanedName}"${emails.length > 0 ? ` (${emails.length} emails)` : ''}`);
          updatedCount++;
        }
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   🗑️  Deleted: ${deletedCount}`);
    console.log(`   📊 Remaining: ${clients.length - deletedCount}`);

    // Show cleaned client list
    const { data: cleanedClients } = await supabase
      .from('clients')
      .select('name, emails')
      .order('name')
      .limit(20);

    if (cleanedClients) {
      console.log('\n📋 Sample Cleaned Clients:');
      console.log('─────────────────────────────────────────────────────────');
      cleanedClients.forEach(client => {
        const emailStr = client.emails && client.emails.length > 0 
          ? ` (${client.emails.join(', ')})` 
          : '';
        console.log(`   ${client.name}${emailStr}`);
      });
    }

    console.log('\n✅ Client structure fixed!');

  } catch (error) {
    console.error('❌ Error fixing client structure:', error);
    process.exit(1);
  }
}

fixClientStructure();

