#!/usr/bin/env node

/**
 * Generate comprehensive vector embeddings for all entities
 * Supports: campaign_groups, vendors, clients, playlists, songs
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openrouterKey = process.env.OPENROUTER_API_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

if (!openrouterKey) {
  console.error('❌ OPENROUTER_API_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function generateEmbedding(text) {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://artistinfluence.com',
      'X-Title': 'Artist Influence Analytics'
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-ada-002',
      input: text
    })
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`OpenRouter API error: ${response.status}`);
    console.error('Response:', responseText.substring(0, 200));
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  // Check if response is HTML (error page)
  if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
    console.error('Received HTML instead of JSON. API key might be invalid.');
    console.error('Response preview:', responseText.substring(0, 200));
    throw new Error('Invalid API response - received HTML instead of JSON');
  }

  const data = JSON.parse(responseText);
  return data.data[0].embedding;
}

async function generateCampaignGroupEmbeddings() {
  console.log('\n📊 Generating embeddings for campaign groups...');
  
  const { data: campaigns, error } = await supabase
    .from('campaign_groups')
    .select(`
      *,
      clients:client_id (name, emails)
    `);

  if (error) {
    console.error('Error fetching campaign groups:', error);
    return 0;
  }

  let generated = 0;

  for (const campaign of campaigns) {
    // Create rich text representation
    const content = `
Campaign: ${campaign.name}
Artist: ${campaign.artist_name || 'N/A'}
Client: ${campaign.clients?.name || 'N/A'}
Status: ${campaign.status}
Goal: ${campaign.total_goal?.toLocaleString()} streams
Budget: $${campaign.total_budget}
Start Date: ${campaign.start_date}
Salesperson: ${campaign.salesperson || 'N/A'}
Notes: ${campaign.notes || 'None'}
    `.trim();

    const metadata = {
      name: campaign.name,
      artist: campaign.artist_name,
      client: campaign.clients?.name,
      status: campaign.status,
      goal: campaign.total_goal,
      budget: campaign.total_budget,
      start_date: campaign.start_date
    };

    try {
      const embedding = await generateEmbedding(content);

      const { error: upsertError } = await supabase
        .from('entity_embeddings')
        .upsert({
          entity_type: 'campaign_group',
          entity_id: campaign.id,
          content,
          metadata,
          embedding
        }, {
          onConflict: 'entity_type,entity_id'
        });

      if (upsertError) {
        console.error(`Error saving embedding for ${campaign.name}:`, upsertError);
      } else {
        generated++;
        if (generated % 10 === 0) {
          console.log(`   ✅ Generated ${generated}/${campaigns.length} campaign embeddings...`);
        }
      }

      // Rate limiting - wait 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error generating embedding for ${campaign.name}:`, error.message);
    }
  }

  console.log(`✅ Campaign group embeddings: ${generated}/${campaigns.length}`);
  return generated;
}

async function generateVendorEmbeddings() {
  console.log('\n🏢 Generating embeddings for vendors...');
  
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*');

  if (error) {
    console.error('Error fetching vendors:', error);
    return 0;
  }

  let generated = 0;

  for (const vendor of vendors) {
    // Get vendor stats
    const { data: campaigns } = await supabase
      .from('spotify_campaigns')
      .select('status, daily, remaining, goal')
      .eq('vendor_id', vendor.id);

    const activeCampaigns = campaigns?.filter(c => c.status?.toLowerCase() === 'active').length || 0;
    const totalDaily = campaigns?.reduce((sum, c) => sum + (parseInt(c.daily) || 0), 0) || 0;

    const content = `
Vendor: ${vendor.name}
Status: ${vendor.is_active ? 'Active' : 'Inactive'}
Max Daily Streams: ${vendor.max_daily_streams?.toLocaleString()}
Max Concurrent Campaigns: ${vendor.max_concurrent_campaigns}
Cost per 1k Streams: $${vendor.cost_per_1k_streams}
Active Campaigns: ${activeCampaigns}
Current Total Daily Streams: ${totalDaily.toLocaleString()}
    `.trim();

    const metadata = {
      name: vendor.name,
      is_active: vendor.is_active,
      max_daily_streams: vendor.max_daily_streams,
      max_concurrent_campaigns: vendor.max_concurrent_campaigns,
      cost_per_1k_streams: parseFloat(vendor.cost_per_1k_streams),
      active_campaigns: activeCampaigns,
      total_daily: totalDaily
    };

    try {
      const embedding = await generateEmbedding(content);

      const { error: upsertError } = await supabase
        .from('entity_embeddings')
        .upsert({
          entity_type: 'vendor',
          entity_id: vendor.id,
          content,
          metadata,
          embedding
        }, {
          onConflict: 'entity_type,entity_id'
        });

      if (upsertError) {
        console.error(`Error saving embedding for ${vendor.name}:`, upsertError);
      } else {
        generated++;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error generating embedding for ${vendor.name}:`, error.message);
    }
  }

  console.log(`✅ Vendor embeddings: ${generated}/${vendors.length}`);
  return generated;
}

async function generateClientEmbeddings() {
  console.log('\n👥 Generating embeddings for clients...');
  
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*');

  if (error) {
    console.error('Error fetching clients:', error);
    return 0;
  }

  let generated = 0;

  for (const client of clients) {
    // Get client's campaign stats
    const { data: campaigns } = await supabase
      .from('campaign_groups')
      .select('total_goal, total_budget, status')
      .eq('client_id', client.id);

    const totalCampaigns = campaigns?.length || 0;
    const activeCampaigns = campaigns?.filter(c => c.status === 'Active').length || 0;
    const totalBudget = campaigns?.reduce((sum, c) => sum + (parseFloat(c.total_budget) || 0), 0) || 0;
    const totalGoal = campaigns?.reduce((sum, c) => sum + (c.total_goal || 0), 0) || 0;

    const content = `
Client: ${client.name}
Contact Emails: ${client.emails?.join(', ') || 'None'}
Contact Person: ${client.contact_person || 'N/A'}
Phone: ${client.phone || 'N/A'}
Credit Balance: ${client.credit_balance || 0}
Total Campaigns: ${totalCampaigns}
Active Campaigns: ${activeCampaigns}
Total Budget Spent: $${totalBudget.toFixed(2)}
Total Stream Goal: ${totalGoal.toLocaleString()}
Notes: ${client.notes || 'None'}
    `.trim();

    const metadata = {
      name: client.name,
      emails: client.emails,
      total_campaigns: totalCampaigns,
      active_campaigns: activeCampaigns,
      total_budget: totalBudget,
      total_goal: totalGoal,
      credit_balance: client.credit_balance
    };

    try {
      const embedding = await generateEmbedding(content);

      const { error: upsertError } = await supabase
        .from('entity_embeddings')
        .upsert({
          entity_type: 'client',
          entity_id: client.id,
          content,
          metadata,
          embedding
        }, {
          onConflict: 'entity_type,entity_id'
        });

      if (upsertError) {
        console.error(`Error saving embedding for ${client.name}:`, upsertError);
      } else {
        generated++;
        if (generated % 20 === 0) {
          console.log(`   ✅ Generated ${generated}/${clients.length} client embeddings...`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error generating embedding for ${client.name}:`, error.message);
    }
  }

  console.log(`✅ Client embeddings: ${generated}/${clients.length}`);
  return generated;
}

async function generateAllEmbeddings() {
  console.log('🤖 Generating comprehensive embeddings for analytics...\n');
  console.log('This will enable natural language queries like:');
  console.log('  - "Which vendor has the best performance?"');
  console.log('  - "Show me campaigns over 100k streams"');
  console.log('  - "What is Club Restricted\'s average cost?"');
  console.log('  - "Which clients have the most active campaigns?"\n');

  const stats = {
    campaigns: 0,
    vendors: 0,
    clients: 0,
    total: 0
  };

  try {
    stats.campaigns = await generateCampaignGroupEmbeddings();
    stats.vendors = await generateVendorEmbeddings();
    stats.clients = await generateClientEmbeddings();
    stats.total = stats.campaigns + stats.vendors + stats.clients;

    console.log('\n\n🎉 All embeddings generated!');
    console.log('─'.repeat(50));
    console.log(`   📊 Campaign Groups: ${stats.campaigns}`);
    console.log(`   🏢 Vendors: ${stats.vendors}`);
    console.log(`   👥 Clients: ${stats.clients}`);
    console.log(`   ─────────────────────`);
    console.log(`   ✅ Total: ${stats.total} embeddings`);
    console.log('─'.repeat(50));

    // Verify
    const { data: count } = await supabase
      .from('entity_embeddings')
      .select('entity_type', { count: 'exact', head: true });

    console.log(`\n📊 Database verification: ${count} total embeddings stored`);

  } catch (error) {
    console.error('\n❌ Error generating embeddings:', error);
    process.exit(1);
  }
}

generateAllEmbeddings();

