#!/usr/bin/env node
/**
 * Creator Profile Refresh Script
 * 
 * Scrapes follower counts, engagement rates, and territory data
 * for all creators in the database via the Apify Instagram scraper.
 * 
 * Designed to run weekly via cron (e.g. every Monday at 3:00 UTC).
 * 
 * Cron setup:
 *   0 3 * * 1 node /path/to/run_creator_refresh.js >> /var/log/creator_refresh.log 2>&1
 * 
 * Usage:
 *   node run_creator_refresh.js
 *   node run_creator_refresh.js --dry-run
 *   node run_creator_refresh.js --batch-size=25
 * 
 * Environment Variables:
 *   API_URL - Base URL of the API server (default: http://localhost:3001)
 */

const https = require('https');
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchSizeArg = args.find(a => a.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 50;
const BATCH_DELAY_MS = 5000;

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 600000, // 10 min timeout for scrape batches
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function fetchAllCreatorHandles() {
  const url = `${SUPABASE_URL}/rest/v1/creators?select=instagram_handle&order=instagram_handle`;
  const res = await makeRequest(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (res.status !== 200 || !Array.isArray(res.data)) {
    throw new Error(`Failed to fetch creators: ${res.status} ${JSON.stringify(res.data)}`);
  }

  return res.data.map(c => c.instagram_handle).filter(Boolean);
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('==========================================');
  log('Creator Profile Refresh Starting');
  log('==========================================');
  log(`API URL: ${API_URL}`);
  log(`Batch Size: ${BATCH_SIZE}`);
  log(`Dry Run: ${dryRun}`);
  log('');

  // Step 1: Check API health
  log('Checking API health...');
  try {
    const healthRes = await makeRequest(`${API_URL}/health`);
    if (healthRes.status !== 200) throw new Error(`Health check failed: ${healthRes.status}`);
    log('API is healthy');
  } catch (e) {
    log(`API health check failed: ${e.message}`, 'ERROR');
    process.exit(1);
  }

  // Step 2: Fetch all creator handles
  log('');
  log('Fetching all creator handles from database...');
  let handles;
  try {
    handles = await fetchAllCreatorHandles();
    log(`Found ${handles.length} creators to refresh`);
  } catch (e) {
    log(`Failed to fetch creators: ${e.message}`, 'ERROR');
    process.exit(1);
  }

  if (handles.length === 0) {
    log('No creators found. Exiting.');
    process.exit(0);
  }

  if (dryRun) {
    log('');
    log('[DRY RUN] Would refresh these creators:');
    handles.forEach(h => log(`  - @${h}`));
    log('');
    log('[DRY RUN] Exiting without making changes.');
    process.exit(0);
  }

  // Step 3: Batch-refresh creators
  const batches = chunk(handles, BATCH_SIZE);
  log(`Processing ${batches.length} batch(es) of up to ${BATCH_SIZE} creators each`);
  log('');

  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    log(`--- Batch ${i + 1}/${batches.length}: ${batch.length} creators ---`);

    try {
      const res = await makeRequest(`${API_URL}/api/instagram-scraper/creator-refresh`, {
        method: 'POST',
        body: { handles: batch },
      });

      if (res.status === 200 && res.data?.success) {
        const results = res.data.results || [];
        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        totalSuccess += succeeded;
        totalFailed += failed;

        log(`  Succeeded: ${succeeded}, Failed: ${failed}`);

        results.filter(r => !r.success).forEach(r => {
          log(`  FAIL @${r.handle}: ${r.reason}`, 'WARN');
        });
      } else {
        log(`  Batch failed: ${JSON.stringify(res.data)}`, 'ERROR');
        totalFailed += batch.length;
      }
    } catch (e) {
      log(`  Batch error: ${e.message}`, 'ERROR');
      totalFailed += batch.length;
    }

    // Delay between batches to avoid rate-limiting
    if (i < batches.length - 1) {
      log(`  Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  log('');
  log('==========================================');
  log('Creator Profile Refresh Complete');
  log('==========================================');
  log(`Total creators processed: ${handles.length}`);
  log(`Succeeded: ${totalSuccess}`);
  log(`Failed: ${totalFailed}`);

  if (totalFailed > 0) process.exit(1);
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'ERROR');
  console.error(err);
  process.exit(1);
});
