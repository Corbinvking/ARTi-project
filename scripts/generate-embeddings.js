#!/usr/bin/env node

/**
 * Script to generate vector embeddings for content using OpenAI
 * Usage: node scripts/generate-embeddings.js --content-type campaign --content-id <id>
 * Usage: node scripts/generate-embeddings.js --content-type playlist --content-id <id>
 * Usage: node scripts/generate-embeddings.js --generate-all --content-type campaign
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const crypto = require('crypto');
require('dotenv').config();

// Simple hash function for text
function simpleHash(text) {
    return crypto.createHash('md5').update(text).digest().readUInt32LE(0);
}

// Initialize clients
// Use localhost URL for local development
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (!supabaseKey || !openRouterKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('   OPENROUTER_API_KEY (or OPENAI_API_KEY)');
    process.exit(1);
}

console.log(`🔗 Connecting to Supabase at: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
// OpenRouter client for embedding generation
const openrouter = {
  apiKey: openRouterKey,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openRouterKey}`,
    'HTTP-Referer': 'https://artistinfluence.com',
    'X-Title': 'ARTi Platform'
  }
};

/**
 * Generate embedding for text content using OpenRouter
 */
async function generateEmbedding(text) {
    try {
        // First, get semantic features through chat completion
        const response = await fetch(`${openrouter.baseURL}/chat/completions`, {
            method: 'POST',
            headers: openrouter.headers,
            body: JSON.stringify({
                model: 'google/palm-2-chat-bison',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that analyzes text. Extract key semantic features and return them as a JSON object with these properties: topics (array of strings), sentiment (number -1 to 1), complexity (number 0 to 1), formality (number 0 to 1), key_entities (array of strings), and relationships (array of strings describing relationships between entities).'
                    },
                    {
                        role: 'user',
                        content: `Analyze this text and return semantic features: "${text}"`
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenRouter API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        const features = JSON.parse(data.choices[0].message.content);
        
        // Convert features to a fixed-length embedding vector
        const embedding = new Array(1536).fill(0);
        
        // Encode topics (0-255)
        features.topics.forEach((topic, i) => {
            if (i < 32) {
                const hash = simpleHash(topic);
                for (let j = 0; j < 8; j++) {
                    embedding[i * 8 + j] = ((hash >> j) & 1) * 2 - 1;
                }
            }
        });
        
        // Encode sentiment (256-383)
        for (let i = 0; i < 128; i++) {
            embedding[256 + i] = features.sentiment;
        }
        
        // Encode complexity (384-511)
        for (let i = 0; i < 128; i++) {
            embedding[384 + i] = features.complexity * 2 - 1;
        }
        
        // Encode formality (512-639)
        for (let i = 0; i < 128; i++) {
            embedding[512 + i] = features.formality * 2 - 1;
        }
        
        // Encode entities (640-1023)
        features.key_entities.forEach((entity, i) => {
            if (i < 48) {
                const hash = simpleHash(entity);
                for (let j = 0; j < 8; j++) {
                    embedding[640 + i * 8 + j] = ((hash >> j) & 1) * 2 - 1;
                }
            }
        });
        
        // Encode relationships (1024-1535)
        features.relationships.forEach((rel, i) => {
            if (i < 64) {
                const hash = simpleHash(rel);
                for (let j = 0; j < 8; j++) {
                    embedding[1024 + i * 8 + j] = ((hash >> j) & 1) * 2 - 1;
                }
            }
        });
        
        return embedding;
    } catch (error) {
        console.error('❌ Error generating embedding:', error.message);
        throw error;
    }
}

/**
 * Create searchable content from campaign data
 */
function createCampaignSearchContent(campaign) {
    const parts = [
        campaign.name || '',
        campaign.client_name || campaign.client || '',
        campaign.track_name || '',
        campaign.notes || '',
        campaign.music_genres?.join(' ') || '',
        campaign.territory_preferences?.join(' ') || '',
        campaign.content_types?.join(' ') || '',
    ];

    return parts.filter(Boolean).join(' ').trim();
}

/**
 * Create searchable content from playlist data
 */
function createPlaylistSearchContent(playlist) {
    const parts = [
        playlist.name || '',
        playlist.genres?.join(' ') || '',
        playlist.description || '',
    ];

    return parts.filter(Boolean).join(' ').trim();
}

/**
 * Generate embedding for specific content
 */
async function generateEmbeddingForContent(contentType, contentId) {
    try {
        console.log(`🔄 Generating embedding for ${contentType} ${contentId}...`);

        let content = '';
        let metadata = {};

        if (contentType === 'campaign') {
            // Fetch campaign data from underlying table (not view)
            const { data: campaigns, error } = await supabase
                .from('stream_strategist_campaigns')
                .select('*')
                .eq('id', contentId);

            if (error) {
                throw new Error(`Failed to fetch campaign: ${error.message}`);
            }

            if (!campaigns || campaigns.length === 0) {
                throw new Error(`Campaign not found: ${contentId}`);
            }

            const campaign = campaigns[0];

            content = createCampaignSearchContent(campaign);
            metadata = {
                name: campaign.name,
                client: campaign.client_name || campaign.client,
                track_name: campaign.track_name,
                genres: campaign.music_genres,
                territories: campaign.territory_preferences,
                status: campaign.status,
                stream_goal: campaign.stream_goal,
            };
        } else if (contentType === 'playlist') {
            // Fetch playlist data
            const { data: playlist, error } = await supabase
                .from('playlists')
                .select('*')
                .eq('id', contentId)
                .single();

            if (error) {
                throw new Error(`Failed to fetch playlist: ${error.message}`);
            }

            content = createPlaylistSearchContent(playlist);
            metadata = {
                name: playlist.name,
                genres: playlist.genres,
                url: playlist.url,
                avg_daily_streams: playlist.avg_daily_streams,
            };
        }

        if (!content.trim()) {
            console.log(`⚠️ No searchable content found for ${contentType} ${contentId}`);
            return;
        }

        // Generate embedding
        const embedding = await generateEmbedding(content);

        // Store or update embedding in database
        const { error: upsertError } = await supabase
            .from('content_embeddings')
            .upsert({
                content_type: contentType,
                content_id: contentId,
                content: content,
                embedding: embedding,
                metadata: metadata,
            });

        if (upsertError) {
            throw new Error(`Failed to store embedding: ${upsertError.message}`);
        }

        console.log(`✅ Successfully generated embedding for ${contentType} ${contentId}`);
        console.log(`   Content length: ${content.length} characters`);
        console.log(`   Similarity threshold: ${(1 - (embedding.slice(0, 10))).toFixed(3)}`);

    } catch (error) {
        console.error(`❌ Failed to generate embedding for ${contentType} ${contentId}:`, error.message);
        throw error;
    }
}

/**
 * Generate embeddings for all content of a specific type
 */
async function generateAllEmbeddings(contentType) {
    try {
        console.log(`🔄 Generating embeddings for all ${contentType}s...`);

        let query = supabase.from(contentType === 'campaign' ? 'stream_strategist_campaigns' : `${contentType}s`).select('id');

        const { data: items, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch ${contentType}s: ${error.message}`);
        }

        // Get list of items that already have embeddings
        const { data: existingEmbeddings } = await supabase
            .from('content_embeddings')
            .select('content_id')
            .eq('content_type', contentType);

        const existingIds = new Set(existingEmbeddings?.map(e => e.content_id) || []);
        const itemsToProcess = items.filter(item => !existingIds.has(item.id));

        console.log(`📊 Found ${items.length} total ${contentType}s`);
        console.log(`ℹ️ ${existingIds.size} items already have embeddings`);
        console.log(`📝 Processing ${itemsToProcess.length} remaining items`);

        let successCount = 0;
        let errorCount = 0;

        // Process in batches of 5 to avoid rate limits
        const batchSize = 5;
        for (let i = 0; i < itemsToProcess.length; i += batchSize) {
            const batch = itemsToProcess.slice(i, i + batchSize);
            console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(itemsToProcess.length/batchSize)}...`);
            
            for (const item of batch) {
                try {
                    await generateEmbeddingForContent(contentType, item.id);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Failed to process ${contentType} ${item.id}:`, error.message);
                }
            }

            // Wait 2 seconds between batches to avoid rate limits
            if (i + batchSize < itemsToProcess.length) {
                console.log('⏳ Waiting 2 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log(`📈 Generation Summary:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);

    } catch (error) {
        console.error(`❌ Failed to generate embeddings for ${contentType}:`, error.message);
        throw error;
    }
}

/**
 * Main execution function
 */
async function main() {
    const args = process.argv.slice(2);
    const flags = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const flag = args[i].replace('--', '');
            // Check if next arg exists and doesn't start with --
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                flags[flag] = args[i + 1];
                i++; // Skip next arg as it's the value
            } else {
                // Flag without value (like --generate-all)
                flags[flag] = true;
            }
        }
    }

    console.log('🤖 AI Embedding Generator');
    console.log('========================');

    try {
        if (flags['generate-all'] && flags['content-type']) {
            await generateAllEmbeddings(flags['content-type']);
        } else if (flags['content-type'] && flags['content-id']) {
            await generateEmbeddingForContent(flags['content-type'], flags['content-id']);
        } else {
            console.log('❌ Invalid arguments. Usage:');
            console.log('   node scripts/generate-embeddings.js --content-type campaign --content-id <id>');
            console.log('   node scripts/generate-embeddings.js --content-type playlist --content-id <id>');
            console.log('   node scripts/generate-embeddings.js --generate-all --content-type campaign');
            console.log('Current flags:', flags);
            process.exit(1);
        }

        console.log('🎉 Embedding generation completed!');

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();
