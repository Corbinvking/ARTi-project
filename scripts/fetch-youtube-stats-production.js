#!/usr/bin/env node
/**
 * Production script to fetch YouTube stats for all campaigns
 * Run this on the DigitalOcean droplet where Supabase is running
 * 
 * Usage:
 *   node scripts/fetch-youtube-stats-production.js [--org-id=<id>]
 */

require('dotenv').config({ path: '/root/arti-marketing-ops/apps/api/production.env' });
const https = require('https');
const http = require('http');

// Parse command line args
const args = process.argv.slice(2);
const specificOrgId = args.find(arg => arg.startsWith('--org-id='))?.split('=')[1];

// API endpoint (internal Docker network)
const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || '3001';
const API_URL = `http://${API_HOST}:${API_PORT}`;

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://kong:8000';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🎬 YouTube Stats Fetcher - Production');
console.log('=====================================\n');
console.log(`📡 API URL: ${API_URL}`);
console.log(`🗄️  Supabase: ${SUPABASE_URL}`);
console.log(`🎯 Specific Org: ${specificOrgId || 'All orgs'}\n`);

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Fetch from Supabase
 */
async function supabaseQuery(table, options = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  
  if (options.select) url += `select=${options.select}&`;
  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      url += `${key}=${value}&`;
    });
  }
  if (options.order) url += `order=${options.order}&`;
  
  const response = await makeRequest(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response;
}

/**
 * Bulk fetch stats for an org
 */
async function bulkFetchForOrg(orgId) {
  console.log(`🔄 Fetching stats for org: ${orgId}...`);
  
  try {
    const result = await makeRequest(`${API_URL}/api/youtube-data-api/fetch-all-campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orgId })
    });
    
    console.log(`✅ Updated: ${result.updated}, Errors: ${result.errors}, Skipped: ${result.skipped}`);
    
    if (result.details && result.details.length > 0) {
      console.log('\n📋 Sample results (first 5):');
      result.details.slice(0, 5).forEach(detail => {
        const views = detail.views ? detail.views.toLocaleString() : 'N/A';
        const likes = detail.likes ? detail.likes.toLocaleString() : 'N/A';
        console.log(`  ✓ ${detail.campaign_name}`);
        console.log(`    Views: ${views}, Likes: ${likes}`);
      });
    }
    
    if (result.errors > 0 && result.errorDetails) {
      console.log('\n⚠️  Errors:');
      result.errorDetails.slice(0, 5).forEach(err => {
        console.log(`  ✗ ${err.campaign}: ${err.error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error fetching for org ${orgId}:`, error.message);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const startTime = Date.now();
    
    // If specific org ID provided, use it
    if (specificOrgId) {
      console.log(`🎯 Fetching for specific org: ${specificOrgId}\n`);
      await bulkFetchForOrg(specificOrgId);
    } else {
      // Get all unique org IDs from campaigns
      console.log('📊 Fetching all campaigns to find org IDs...\n');
      
      const campaigns = await supabaseQuery('youtube_campaigns', {
        select: 'org_id',
        filter: { 'youtube_url': 'not.is.null' }
      });
      
      const orgIds = [...new Set(campaigns.map(c => c.org_id).filter(Boolean))];
      
      if (orgIds.length === 0) {
        console.error('❌ No org_id found in campaigns. Please check database.');
        process.exit(1);
      }
      
      console.log(`🏢 Found ${orgIds.length} organization(s): ${orgIds.join(', ')}\n`);
      
      // Fetch for each org
      for (let i = 0; i < orgIds.length; i++) {
        const orgId = orgIds[i];
        console.log(`\n[${i + 1}/${orgIds.length}] Processing org: ${orgId}`);
        console.log('─'.repeat(60));
        
        await bulkFetchForOrg(orgId);
        
        // Rate limiting between orgs
        if (i < orgIds.length - 1) {
          console.log('\n⏳ Waiting 1 second before next org...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Bulk fetch complete! Duration: ${duration}s`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, bulkFetchForOrg };

