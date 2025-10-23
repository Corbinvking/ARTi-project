#!/usr/bin/env node
/**
 * Link Campaign Relationships
 * 
 * This script:
 * 1. Links campaigns to clients (via client_id foreign key)
 * 2. Links campaigns to vendors (via vendor_id foreign key)
 * 3. Uses client/vendor names from campaign data to find matches
 * 4. Reports missing relationships
 * 
 * Usage:
 *   node scripts/link_campaign_relationships.js
 *   node scripts/link_campaign_relationships.js --dry-run
 */

import { createClient } from '@supabase/supabase-js';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get all clients
 */
async function getAllClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name');
  
  if (error) {
    console.error('❌ Error fetching clients:', error.message);
    return [];
  }
  
  return data;
}

/**
 * Get all vendors
 */
async function getAllVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name');
  
  if (error) {
    console.error('❌ Error fetching vendors:', error.message);
    return [];
  }
  
  return data;
}

/**
 * Get all campaigns
 */
async function getAllCampaigns() {
  const { data, error } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign, client, vendor, client_id, vendor_id');
  
  if (error) {
    console.error('❌ Error fetching campaigns:', error.message);
    return [];
  }
  
  return data;
}

/**
 * Find client by name
 */
function findClientByName(clientName, clients) {
  if (!clientName) return null;
  
  const normalized = clientName.trim().toLowerCase();
  return clients.find(c => c.name.toLowerCase() === normalized);
}

/**
 * Find vendor by name
 */
function findVendorByName(vendorName, vendors) {
  if (!vendorName) return null;
  
  const normalized = vendorName.trim().toLowerCase();
  return vendors.find(v => v.name.toLowerCase() === normalized);
}

/**
 * Link campaign to client
 */
async function linkCampaignToClient(campaignId, clientId, dryRun = false) {
  if (dryRun) return { success: true, dryRun: true };
  
  const { error } = await supabase
    .from('spotify_campaigns')
    .update({ client_id: clientId })
    .eq('id', campaignId);
  
  if (error) {
    console.error(`   ❌ Error linking client: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Link campaign to vendor
 */
async function linkCampaignToVendor(campaignId, vendorId, dryRun = false) {
  if (dryRun) return { success: true, dryRun: true };
  
  const { error } = await supabase
    .from('spotify_campaigns')
    .update({ vendor_id: vendorId })
    .eq('id', campaignId);
  
  if (error) {
    console.error(`   ❌ Error linking vendor: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Main execution
 */
async function main() {
  console.log('================================================================================');
  console.log('🔗 LINK CAMPAIGN RELATIONSHIPS');
  console.log('================================================================================\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  // Fetch all data
  console.log('📥 Fetching data...');
  const [clients, vendors, campaigns] = await Promise.all([
    getAllClients(),
    getAllVendors(),
    getAllCampaigns()
  ]);
  
  console.log(`✅ Loaded ${clients.length} clients`);
  console.log(`✅ Loaded ${vendors.length} vendors`);
  console.log(`✅ Loaded ${campaigns.length} campaigns\n`);
  
  // Stats
  let clientsLinked = 0;
  let clientsAlreadyLinked = 0;
  let clientsNotFound = 0;
  let vendorsLinked = 0;
  let vendorsAlreadyLinked = 0;
  let vendorsNotFound = 0;
  let errors = 0;
  
  const missingClients = new Set();
  const missingVendors = new Set();
  
  console.log('🔄 Processing campaigns...\n');
  
  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    const campaignNum = i + 1;
    
    console.log(`   [${campaignNum}/${campaigns.length}] ${campaign.campaign}`);
    
    // Link client
    if (campaign.client && !campaign.client_id) {
      const client = findClientByName(campaign.client, clients);
      
      if (client) {
        const result = await linkCampaignToClient(campaign.id, client.id, dryRun);
        if (result.success) {
          console.log(`      ✅ Linked to client: ${client.name}`);
          clientsLinked++;
        } else {
          console.log(`      ❌ Error linking client`);
          errors++;
        }
      } else {
        console.log(`      ⚠️  Client not found: ${campaign.client}`);
        missingClients.add(campaign.client);
        clientsNotFound++;
      }
    } else if (campaign.client_id) {
      clientsAlreadyLinked++;
    }
    
    // Link vendor
    if (campaign.vendor && !campaign.vendor_id) {
      const vendor = findVendorByName(campaign.vendor, vendors);
      
      if (vendor) {
        const result = await linkCampaignToVendor(campaign.id, vendor.id, dryRun);
        if (result.success) {
          console.log(`      ✅ Linked to vendor: ${vendor.name}`);
          vendorsLinked++;
        } else {
          console.log(`      ❌ Error linking vendor`);
          errors++;
        }
      } else {
        console.log(`      ⚠️  Vendor not found: ${campaign.vendor}`);
        missingVendors.add(campaign.vendor);
        vendorsNotFound++;
      }
    } else if (campaign.vendor_id) {
      vendorsAlreadyLinked++;
    }
    
    console.log('');
    
    // Small delay to avoid overwhelming the database
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Summary
  console.log('================================================================================');
  console.log('📊 LINK SUMMARY');
  console.log('================================================================================\n');
  
  console.log('👥 CLIENTS:');
  console.log(`   ✅ Linked:          ${clientsLinked}`);
  console.log(`   ✅ Already linked:  ${clientsAlreadyLinked}`);
  console.log(`   ⚠️  Not found:       ${clientsNotFound}`);
  console.log('');
  
  console.log('🏢 VENDORS:');
  console.log(`   ✅ Linked:          ${vendorsLinked}`);
  console.log(`   ✅ Already linked:  ${vendorsAlreadyLinked}`);
  console.log(`   ⚠️  Not found:       ${vendorsNotFound}`);
  console.log('');
  
  console.log(`❌ Errors:   ${errors}`);
  console.log(`📊 Total:    ${campaigns.length}`);
  console.log('');
  
  // Show missing clients/vendors
  if (missingClients.size > 0) {
    console.log('⚠️  MISSING CLIENTS:');
    Array.from(missingClients).forEach(client => {
      console.log(`   - ${client}`);
    });
    console.log('');
  }
  
  if (missingVendors.size > 0) {
    console.log('⚠️  MISSING VENDORS:');
    Array.from(missingVendors).forEach(vendor => {
      console.log(`   - ${vendor}`);
    });
    console.log('');
  }
  
  if (dryRun) {
    console.log('⚠️  This was a DRY RUN - no changes were made');
    console.log('   Run without --dry-run to apply changes\n');
  } else {
    console.log('🎉 Relationship linking complete!\n');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

