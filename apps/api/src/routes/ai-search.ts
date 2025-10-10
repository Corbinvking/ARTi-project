import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseKey || !openaiKey) {
    throw new Error('Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

/**
 * Generate embedding for text content using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: text,
            encoding_format: 'float',
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
}

/**
 * POST /api/ai-search/similar-campaigns
 * Search for similar campaigns using vector similarity
 */
router.post('/similar-campaigns', async (req, res) => {
    try {
        const { query, contentType = 'campaign', threshold = 0.7, maxResults = 10 } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query text is required' });
        }

        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);

        // Search for similar content
        const { data: results, error } = await supabase.rpc('search_similar_content', {
            query_embedding: queryEmbedding,
            content_type_filter: contentType,
            similarity_threshold: threshold,
            max_results: maxResults,
        });

        if (error) {
            console.error('Error searching similar content:', error);
            return res.status(500).json({ error: 'Failed to search similar content' });
        }

        // Format results with campaign data
        const formattedResults = await Promise.all(
            results.map(async (result: any) => {
                // Fetch the actual campaign data
                const { data: campaign, error: campaignError } = await supabase
                    .from('campaigns')
                    .select('*')
                    .eq('id', result.content_id)
                    .single();

                if (campaignError) {
                    console.error('Error fetching campaign:', campaignError);
                    return null;
                }

                return {
                    ...campaign,
                    similarity: result.similarity,
                    search_content: result.content,
                };
            })
        );

        // Filter out null results
        const validResults = formattedResults.filter(Boolean);

        res.json({
            query,
            results: validResults,
            total: validResults.length,
        });

    } catch (error) {
        console.error('Error in similar campaigns search:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/ai-search/generate-embedding
 * Generate and store embedding for specific content
 */
router.post('/generate-embedding', async (req, res) => {
    try {
        const { contentType, contentId, content, metadata = {} } = req.body;

        if (!contentType || !contentId || !content) {
            return res.status(400).json({
                error: 'contentType, contentId, and content are required'
            });
        }

        // Generate embedding
        const embedding = await generateEmbedding(content);

        // Store in database
        const { data, error } = await supabase
            .from('content_embeddings')
            .upsert({
                content_type: contentType,
                content_id: contentId,
                content: content,
                embedding: embedding,
                metadata: metadata,
            })
            .select()
            .single();

        if (error) {
            console.error('Error storing embedding:', error);
            return res.status(500).json({ error: 'Failed to store embedding' });
        }

        res.json({
            success: true,
            embeddingId: data.id,
            contentType,
            contentId,
        });

    } catch (error) {
        console.error('Error generating embedding:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/ai-search/search-suggestions
 * Get search suggestions based on partial query
 */
router.get('/search-suggestions', async (req, res) => {
    try {
        const { q, contentType = 'campaign', limit = 5 } = req.query;

        if (!q || typeof q !== 'string' || q.length < 2) {
            return res.json({ suggestions: [] });
        }

        // Search for content that contains the query
        const { data: results, error } = await supabase
            .from('content_embeddings')
            .select('content, metadata')
            .eq('content_type', contentType)
            .ilike('content', `%${q}%`)
            .limit(limit);

        if (error) {
            console.error('Error fetching search suggestions:', error);
            return res.status(500).json({ error: 'Failed to fetch suggestions' });
        }

        const suggestions = results.map(result => ({
            text: result.content.substring(0, 100) + (result.content.length > 100 ? '...' : ''),
            metadata: result.metadata,
        }));

        res.json({ suggestions });

    } catch (error) {
        console.error('Error in search suggestions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/ai-search/generate-all-embeddings
 * Generate embeddings for all content of a specific type
 */
router.post('/generate-all-embeddings', async (req, res) => {
    try {
        const { contentType } = req.body;

        if (!contentType) {
            return res.status(400).json({ error: 'contentType is required' });
        }

        // This would typically trigger the generate-embeddings.js script
        // For now, we'll do it synchronously (consider using a job queue in production)
        const { exec } = require('child_process');
        const scriptPath = require('path').join(__dirname, '../../scripts/generate-embeddings.js');

        exec(`node ${scriptPath} --generate-all --content-type ${contentType}`, (error, stdout, stderr) => {
            if (error) {
                console.error('Error running embedding generation:', error);
                return res.status(500).json({ error: 'Failed to generate embeddings' });
            }

            res.json({
                success: true,
                message: 'Embedding generation started',
                output: stdout,
            });
        });

    } catch (error) {
        console.error('Error in generate all embeddings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
