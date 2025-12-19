import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// LLM Configuration - Just add your API key to use
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic'; // 'anthropic' or 'openai' - reserved for future use
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Database Schema Context for the LLM
const DATABASE_SCHEMA = `
## Spotify Platform Tables

### spotify_campaigns
Main table for Spotify playlist campaigns
- id: integer (primary key)
- campaign: text (campaign name)
- client_id: uuid (FK to clients)
- vendor_id: uuid (FK to vendors)
- campaign_group_id: uuid (FK to campaign_groups)
- spotify_track_url: text
- track_name: text
- artist_name: text
- primary_genre: text
- all_genres: text[] (array)
- track_popularity: integer
- target_streams: integer
- actual_streams: integer
- start_date: date
- end_date: date
- status: text
- playlist_links: text

### campaign_groups
Campaign containers that can have multiple songs
- id: uuid (primary key)
- name: text
- client_id: uuid (FK to clients)
- status: text ('Active', 'Draft', 'Pending', 'Complete', 'Paused')
- total_goal: integer (total stream target)
- total_budget: decimal
- created_at: timestamp
- updated_at: timestamp

### clients
Client companies/artists
- id: uuid (primary key)
- name: text
- email: text
- phone: text
- notes: text
- created_at: timestamp

### vendors
Playlist promotion vendors
- id: uuid (primary key)
- name: text
- cost_per_1k_streams: decimal
- max_daily_streams: integer
- max_concurrent_campaigns: integer
- contact_email: text
- is_active: boolean

### playlists
Spotify playlist data
- id: uuid (primary key)
- spotify_id: varchar(22) (unique)
- name: text
- vendor_id: uuid (FK to vendors, nullable)
- playlist_url: text
- playlist_curator: text
- follower_count: integer
- genres: text[] (array)
- is_algorithmic: boolean

### campaign_playlists
Links campaigns to playlists with performance data
- id: uuid (primary key)
- campaign_id: integer (FK to spotify_campaigns)
- vendor_id: uuid (FK to vendors)
- playlist_spotify_id: text
- playlist_follower_count: integer
- playlist_url: text

## YouTube Platform Tables

### youtube_campaigns
- id: uuid (primary key)
- campaign_name: text
- youtube_url: text
- video_id: text
- current_views: integer
- current_likes: integer
- current_comments: integer
- total_subscribers: integer
- budget: decimal
- status: text

## Instagram Platform Tables  

### instagram_campaigns
- id: integer (primary key)
- campaign_name: text
- brand_name: text
- budget: decimal
- status: text
- creator_count: integer
- total_reach: integer

### instagram_creators
- id: uuid (primary key)
- instagram_handle: text
- followers: bigint
- engagement_rate: decimal

## SoundCloud Platform Tables

### soundcloud_members
- id: uuid (primary key)
- name: text
- followers: integer
- size_tier: enum ('T1', 'T2', 'T3', 'T4')
- status: enum ('active', 'needs_reconnect')
- credits_given: integer
- credits_used: integer

### soundcloud_submissions
- id: uuid (primary key)
- member_id: uuid
- track_url: text
- artist_name: text
- status: enum ('new', 'approved', 'rejected')
`;

interface AIAnalyticsRequest {
  Body: {
    query: string;
    conversationHistory?: { role: string; content: string }[];
  };
}

// Initialize Anthropic client
let anthropicClient: Anthropic | null = null;
if (ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// Generate SQL from natural language using Claude
async function generateSQLWithClaude(userQuery: string): Promise<{ sql: string | null; explanation: string }> {
  if (!anthropicClient) {
    return { sql: null, explanation: 'Anthropic API key not configured' };
  }

  const systemPrompt = `You are a SQL query generator for a Spotify/YouTube/Instagram campaign analytics database.

${DATABASE_SCHEMA}

RULES:
1. ONLY generate SELECT queries - never INSERT, UPDATE, DELETE, or any DDL
2. Always use lowercase table and column names
3. For campaign counts, use campaign_groups table
4. For vendor performance, use vendors table
5. For client info, use clients table
6. Return ONLY the SQL query, nothing else
7. If the question cannot be answered with a query, return "NO_SQL_NEEDED"
8. Limit results to 20 unless user asks for more
9. Use proper JOIN syntax when combining tables

Examples:
- "How many campaigns?" -> SELECT COUNT(*) as count FROM campaign_groups;
- "Top vendors" -> SELECT name, max_daily_streams, cost_per_1k_streams FROM vendors ORDER BY max_daily_streams DESC LIMIT 10;
- "Active campaigns" -> SELECT * FROM campaign_groups WHERE status = 'Active' LIMIT 20;
`;

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userQuery }]
    });

    const sql = (response.content[0] as { type: string; text: string }).text.trim();
    
    // Security check - only allow SELECT
    if (sql !== 'NO_SQL_NEEDED' && !sql.toUpperCase().startsWith('SELECT')) {
      return { sql: null, explanation: 'Invalid query type detected' };
    }

    return { sql: sql === 'NO_SQL_NEEDED' ? null : sql, explanation: '' };
  } catch (error: any) {
    console.error('Claude API error:', error);
    return { sql: null, explanation: error.message };
  }
}

// Generate natural language answer using Claude
async function generateAnswerWithClaude(
  userQuery: string, 
  queryResults: any[], 
  sqlUsed?: string
): Promise<string> {
  if (!anthropicClient) {
    return formatResultsWithoutLLM(userQuery, queryResults);
  }

  const systemPrompt = `You are a helpful analytics assistant for a music marketing platform. 
You provide clear, concise answers about campaigns, vendors, clients, and performance metrics.
Use markdown formatting for better readability.
Be professional but friendly.`;

  const userMessage = sqlUsed 
    ? `User asked: "${userQuery}"

I ran this query: ${sqlUsed}

Results: ${JSON.stringify(queryResults, null, 2)}

Provide a clear, helpful answer summarizing the data. Use bullet points and bold text for key metrics.`
    : `User asked: "${userQuery}"

Answer this question about the platform using general knowledge. Be helpful and suggest what data they might want to look up.`;

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    return (response.content[0] as { type: string; text: string }).text;
  } catch (error: any) {
    console.error('Claude answer error:', error);
    return formatResultsWithoutLLM(userQuery, queryResults);
  }
}

// Fallback formatting without LLM
function formatResultsWithoutLLM(_query: string, results: any[]): string {
  if (!results || results.length === 0) {
    return "No results found for your query.";
  }
  
  if (results.length === 1 && results[0].count !== undefined) {
    return `**Count:** ${results[0].count}`;
  }

  const formatted = results.slice(0, 10).map((row, i) => {
    const name = row.name || row.campaign || row.campaign_name || `Item ${i + 1}`;
    const details = Object.entries(row)
      .filter(([k]) => k !== 'name' && k !== 'id')
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return `${i + 1}. **${name}** - ${details}`;
  }).join('\n');

  return `Found ${results.length} results:\n\n${formatted}`;
}

export default async function aiAnalyticsLLMRoutes(fastify: FastifyInstance) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Main AI Analytics endpoint
  fastify.post<AIAnalyticsRequest>('/ai-analytics', async (request: FastifyRequest<AIAnalyticsRequest>, reply: FastifyReply) => {
    try {
      const { query } = request.body;

      if (!query) {
        return reply.code(400).send({ error: 'Query is required' });
      }

      console.log(`🤖 AI Analytics query: "${query}"`);

      // Check if LLM is configured
      if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
        console.log('⚠️ No LLM API key configured, using pattern matching fallback');
        // Fall back to pattern matching (import from simple version)
        const { analyzeQuerySimple } = await import('./ai-analytics-fallback');
        const result = await analyzeQuerySimple(query, supabase);
        return reply.send(result);
      }

      // Step 1: Generate SQL query from natural language
      const { sql, explanation } = await generateSQLWithClaude(query);
      
      let queryResults: any[] = [];
      let error: string | null = null;

      // Step 2: Execute the SQL query
      if (sql) {
        console.log(`📊 Generated SQL: ${sql}`);
        
        try {
          // Use raw SQL via Supabase
          const { data, error: dbError } = await supabase.rpc('execute_readonly_query', { 
            query_text: sql 
          });

          if (dbError) {
            // If RPC doesn't exist, try direct query for simple tables
            console.log('RPC not available, trying direct query...');
            
            // Parse the table from SQL (simple extraction)
            const tableMatch = sql.match(/FROM\s+(\w+)/i);
            if (tableMatch && tableMatch[1]) {
              const tableName: string = tableMatch[1];
              const { data: directData, error: directError } = await supabase
                .from(tableName as string)
                .select('*')
                .limit(20);
              
              if (!directError) {
                queryResults = directData || [];
              } else {
                error = directError.message;
              }
            }
          } else {
            queryResults = data || [];
          }
        } catch (e: any) {
          error = e.message;
        }
      }

      // Step 3: Generate natural language answer
      const answer = await generateAnswerWithClaude(query, queryResults, sql || undefined);

      return reply.send({
        answer,
        data: queryResults,
        sql: sql || undefined,
        debug: process.env.NODE_ENV === 'development' ? { sql, explanation, error } : undefined
      });

    } catch (error: any) {
      console.error('Error in AI analytics endpoint:', error);
      return reply.code(500).send({ 
        error: 'Internal server error', 
        message: error.message,
        answer: "I apologize, but I encountered an error processing your request. Please try again."
      });
    }
  });

  // Health check
  fastify.get('/ai-analytics/health', async (_request, reply) => {
    try {
      const { count } = await supabase
        .from('campaign_groups')
        .select('*', { count: 'exact', head: true });

      return reply.send({
        status: 'healthy',
        campaigns_count: count,
        llm_configured: !!(ANTHROPIC_API_KEY || OPENAI_API_KEY),
        llm_provider: ANTHROPIC_API_KEY ? 'anthropic' : OPENAI_API_KEY ? 'openai' : 'none'
      });
    } catch (error: any) {
      return reply.code(500).send({
        status: 'error',
        message: error.message
      });
    }
  });

  // Schema info endpoint (useful for debugging)
  fastify.get('/ai-analytics/schema', async (_request, reply) => {
    return reply.send({
      schema: DATABASE_SCHEMA,
      tables: [
        'spotify_campaigns',
        'campaign_groups', 
        'clients',
        'vendors',
        'playlists',
        'campaign_playlists',
        'youtube_campaigns',
        'instagram_campaigns',
        'instagram_creators',
        'soundcloud_members',
        'soundcloud_submissions'
      ]
    });
  });
}

