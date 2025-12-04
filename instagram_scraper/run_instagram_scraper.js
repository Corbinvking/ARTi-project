#!/usr/bin/env node
/**
 * Instagram Scraper Cron Job Script (Node.js version)
 * 
 * This script runs the Instagram batch scraper.
 * Can be called by cron or run manually.
 * 
 * Usage:
 *   node run_instagram_scraper.js
 *   node run_instagram_scraper.js --dry-run
 *   node run_instagram_scraper.js --limit 50
 * 
 * Environment Variables:
 *   API_URL - Base URL of the API server (default: http://localhost:3001)
 *   APIFY_API_TOKEN - Apify API token (required if not set on server)
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const resultsLimit = limitArg ? parseInt(limitArg.split('=')[1]) : 30;

// Logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
}

// HTTP request helper
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
            timeout: 300000, // 5 minute timeout for batch operations
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data),
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                    });
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

// Main function
async function main() {
    log('==========================================');
    log('Instagram Scraper Cron Job Starting');
    log('==========================================');
    log(`API URL: ${API_URL}`);
    log(`Results Limit: ${resultsLimit}`);
    log(`Dry Run: ${dryRun}`);
    log('');

    try {
        // Step 1: Check API health
        log('Checking API health...');
        try {
            const healthRes = await makeRequest(`${API_URL}/health`);
            if (healthRes.status !== 200) {
                throw new Error(`Health check failed: ${healthRes.status}`);
            }
            log('✅ API is healthy');
        } catch (e) {
            log(`❌ API health check failed: ${e.message}`, 'ERROR');
            process.exit(1);
        }

        // Step 2: Fetch campaigns (to see what will be scraped)
        log('');
        log('Fetching campaigns with scraper enabled...');
        const campaignsRes = await makeRequest(`${API_URL}/api/instagram-scraper/campaigns`);
        
        if (campaignsRes.status !== 200 || !campaignsRes.data?.success) {
            log(`❌ Failed to fetch campaigns: ${JSON.stringify(campaignsRes.data)}`, 'ERROR');
            process.exit(1);
        }

        const { campaigns, stats } = campaignsRes.data.data;
        log(`📊 Campaign Stats:`);
        log(`   - Total campaigns: ${stats.total}`);
        log(`   - Scraper enabled: ${stats.scraperEnabled}`);
        log(`   - With Instagram URL: ${stats.withInstagramUrl}`);

        const eligibleCampaigns = campaigns.filter(c => c.scraper_enabled && c.instagram_url);
        log(`   - Eligible for scraping: ${eligibleCampaigns.length}`);
        
        if (eligibleCampaigns.length === 0) {
            log('');
            log('⚠️  No campaigns eligible for scraping (need scraper_enabled=true AND instagram_url set)');
            log('');
            log('To enable scraping for a campaign:');
            log(`   curl -X PATCH "${API_URL}/api/instagram-scraper/campaign/{id}" \\`);
            log('        -H "Content-Type: application/json" \\');
            log('        -d \'{"instagram_url": "https://instagram.com/username", "scraper_enabled": true}\'');
            log('');
            log('✅ Script complete (nothing to scrape)');
            process.exit(0);
        }

        log('');
        log('Eligible campaigns:');
        eligibleCampaigns.forEach(c => {
            log(`   - [${c.id}] ${c.campaign || 'Unnamed'}: ${c.instagram_url}`);
        });

        // Step 3: Run batch scraper
        log('');
        log('🚀 Starting batch scraper...');
        
        const batchRes = await makeRequest(`${API_URL}/api/instagram-scraper/batch`, {
            method: 'POST',
            body: {
                resultsLimit,
                dryRun,
            },
        });

        if (batchRes.status !== 200 || !batchRes.data?.success) {
            log(`❌ Batch scraper failed: ${JSON.stringify(batchRes.data)}`, 'ERROR');
            process.exit(1);
        }

        const result = batchRes.data.data;
        log('');
        log('📊 Scraping Results:');
        log(`   - Campaigns processed: ${result.processed}`);
        log(`   - Succeeded: ${result.succeeded}`);
        log(`   - Failed: ${result.failed}`);
        if (result.totalPosts !== undefined) {
            log(`   - Total posts scraped: ${result.totalPosts}`);
        }

        if (result.results && result.results.length > 0) {
            log('');
            log('Campaign Results:');
            result.results.forEach(r => {
                const icon = r.status === 'success' ? '✅' : '❌';
                const postsInfo = r.postsScraped !== undefined ? ` (${r.postsScraped} posts)` : '';
                const errorInfo = r.error ? ` - Error: ${r.error}` : '';
                log(`   ${icon} [${r.campaignId}] ${r.name}${postsInfo}${errorInfo}`);
            });
        }

        log('');
        log('==========================================');
        log('✅ Instagram Scraper Cron Job Complete');
        log('==========================================');

        // Exit with error if any campaigns failed
        if (result.failed > 0) {
            process.exit(1);
        }

    } catch (error) {
        log(`❌ Fatal error: ${error.message}`, 'ERROR');
        console.error(error);
        process.exit(1);
    }
}

// Run
main();

