import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface InstagramCampaignRow {
  id: string;
  campaign: string;
  clients: string;
  start_date: string;
  price: string;
  spend: string;
  remaining: string;
  sound_url: string;
  status: string;
  tracker: string;
  campaign_started: string;
  send_tracker: string;
  send_final_report: string;
  invoice: string;
  salespeople: string;
  report_notes: string;
  client_notes: string;
  paid_ops: string;
  created_at: string;
  updated_at: string;
}

interface ClientData {
  name: string;
  totalCampaigns: number;
  totalSpend: number;
  activeCampaigns: number;
  completedCampaigns: number;
  salesperson?: string;
}

function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function cleanClientName(name: string): string {
  if (!name) return '';
  // Remove extra characters, trim
  return name.trim()
    .replace(/\s+/g, ' ')
    .replace(/,$/, ''); // Remove trailing commas
}

function generateInstagramHandle(clientName: string): string {
  // Convert client name to potential Instagram handle
  return clientName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 30); // Instagram handle max length
}

async function main() {
  console.log('📸 Instagram Clients → Creators Import\n');
  
  // Read CSV file
  const csvPath = path.join(process.cwd(), 'apps/api/data-exports/instagram_campaigns.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const rows: InstagramCampaignRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  
  console.log(`📄 Found ${rows.length} campaigns in CSV\n`);
  
  // Aggregate client data
  const clientsMap = new Map<string, ClientData>();
  
  for (const row of rows) {
    const clientName = cleanClientName(row.clients);
    
    // Skip empty or invalid client names
    if (!clientName || clientName.length < 2) {
      continue;
    }
    
    // Skip rows that look like notes or metadata
    if (clientName.includes('http') || 
        clientName.includes('preferred') || 
        clientName.includes('let me know') ||
        clientName.length > 100) {
      continue;
    }
    
    if (!clientsMap.has(clientName)) {
      clientsMap.set(clientName, {
        name: clientName,
        totalCampaigns: 0,
        totalSpend: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
      });
    }
    
    const client = clientsMap.get(clientName)!;
    client.totalCampaigns++;
    client.totalSpend += parseCurrency(row.spend);
    
    if (row.status === 'Active') {
      client.activeCampaigns++;
    } else if (row.status === 'Completed') {
      client.completedCampaigns++;
    }
    
    if (row.salespeople && !client.salesperson) {
      client.salesperson = row.salespeople;
    }
  }
  
  console.log(`👥 Found ${clientsMap.size} unique clients\n`);
  
  // Import to creators table
  console.log('📥 Importing clients as creators...\n');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const [clientName, clientData] of clientsMap.entries()) {
    try {
      const instagramHandle = generateInstagramHandle(clientName);
      
      // Check if creator already exists
      const { data: existing } = await supabase
        .from('creators')
        .select('id')
        .eq('instagram_handle', instagramHandle)
        .single();
      
      if (existing) {
        console.log(`⏭️  Skipped (exists): ${clientName}`);
        skippedCount++;
        continue;
      }
      
      // Insert creator
      const { error } = await supabase
        .from('creators')
        .insert({
          instagram_handle: instagramHandle,
          email: null, // We don't have email data
          base_country: 'US', // Default, can be updated later
          followers: 0, // Unknown
          median_views_per_video: 0,
          engagement_rate: 0,
          reel_rate: 0,
          carousel_rate: 0,
          story_rate: 0,
          content_types: ['music'], // Default for music clients
          music_genres: ['electronic', 'edm'], // Default
          audience_territories: ['US'], // Default
          // Store client metadata in notes or custom fields if available
        });
      
      if (error) {
        console.error(`❌ Failed: ${clientName} - ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ Imported: ${clientName} (@${instagramHandle}) - ${clientData.totalCampaigns} campaigns, $${clientData.totalSpend.toFixed(2)} spent`);
        successCount++;
      }
      
    } catch (error: any) {
      console.error(`❌ Error importing ${clientName}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  📊 Total Unique Clients: ${clientsMap.size}\n`);
  
  // Show top clients
  const topClients = Array.from(clientsMap.values())
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 10);
  
  console.log('🏆 Top 10 Clients by Spend:');
  topClients.forEach((client, i) => {
    console.log(`  ${i + 1}. ${client.name} - $${client.totalSpend.toFixed(2)} (${client.totalCampaigns} campaigns)`);
  });
  
  console.log('\n✨ Instagram clients import complete!\n');
}

main().catch(console.error);

