import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const openrouterKey = process.env.OPENROUTER_API_KEY || '';

interface AIAnalyticsRequest {
  Body: {
    query: string;
    conversationHistory?: Array<{ role: string; content: string }>;
  };
}

async function generateEmbedding(text: string): Promise<number[]> {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  return data.data[0].embedding;
}

async function generateChatResponse(query: string, context: any[]): Promise<string> {
  // Format context for the LLM
  const contextText = context.map((item, idx) => {
    return `[${idx + 1}] ${item.content}\nRelevance: ${(item.similarity * 100).toFixed(0)}%`;
  }).join('\n\n');

  const systemPrompt = `You are an AI analytics assistant for Artist Influence, a music marketing platform. You help analyze campaign data, vendor performance, and client metrics.

You have access to the following relevant data from the database:

${contextText}

Based on this data, answer the user's question clearly and concisely. If you can provide specific numbers, metrics, or insights, do so. If the data doesn't contain enough information to fully answer the question, acknowledge what you can and cannot determine from the available data.

Format your response in a friendly, professional tone. Use bullet points for lists and be specific with numbers.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://artistinfluence.com',
      'X-Title': 'Artist Influence Analytics'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter chat API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

export default async function aiAnalyticsRoutes(fastify: FastifyInstance) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // AI Analytics Chat Endpoint
  fastify.post<AIAnalyticsRequest>('/ai-analytics', async (request: FastifyRequest<AIAnalyticsRequest>, reply: FastifyReply) => {
    try {
      const { query } = request.body;

      if (!query) {
        return reply.code(400).send({ error: 'Query is required' });
      }

      console.log(`🤖 AI Analytics query: "${query}"`);

      // Step 1: Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);

      // Step 2: Search for relevant entities using vector similarity
      const { data: relevantEntities, error: searchError } = await supabase
        .rpc('search_entities_semantic', {
          query_embedding: JSON.stringify(queryEmbedding),
          match_threshold: 0.6,
          match_count: 10
        });

      if (searchError) {
        console.error('Error searching entities:', searchError);
        return reply.code(500).send({ error: 'Failed to search database' });
      }

      console.log(`✅ Found ${relevantEntities?.length || 0} relevant entities`);

      // Step 3: Generate answer using LLM with context
      const answer = await generateChatResponse(query, relevantEntities || []);

      console.log(`✅ Generated answer: ${answer.substring(0, 100)}...`);

      return reply.send({
        answer,
        context: relevantEntities,
        query
      });

    } catch (error: any) {
      console.error('Error in AI analytics endpoint:', error);
      return reply.code(500).send({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  });

  // Health check for AI analytics
  fastify.get('/ai-analytics/health', async (_request, reply) => {
    try {
      // Check if embeddings exist
      const { count, error } = await supabase
        .from('entity_embeddings')
        .select('*', { count: 'exact', head: true });

      if (error) {
        return reply.send({
          status: 'unhealthy',
          error: error.message,
          embeddings_count: 0
        });
      }

      return reply.send({
        status: 'healthy',
        embeddings_count: count,
        openrouter_configured: !!openrouterKey
      });
    } catch (error: any) {
      return reply.code(500).send({
        status: 'error',
        message: error.message
      });
    }
  });
}

