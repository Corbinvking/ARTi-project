import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface AIAnalyticsRequest {
  Body: {
    query: string;
  };
}

// Simple pattern matching for common queries (works without embeddings)
async function analyzeQuery(query: string, supabase: any) {
  const lowerQuery = query.toLowerCase();
  
  // Vendor queries
  if (lowerQuery.includes('vendor') && (lowerQuery.includes('best') || lowerQuery.includes('performance'))) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('*')
      .order('max_daily_streams', { ascending: false })
      .limit(5);
    
    const topVendor = vendors?.[0];
    
    return {
      answer: `Based on max daily stream capacity, **${topVendor?.name}** is the top performing vendor with ${topVendor?.max_daily_streams?.toLocaleString()} max daily streams and ${topVendor?.max_concurrent_campaigns} active campaigns. Their cost is $${topVendor?.cost_per_1k_streams}/1k streams.\n\n**Top 5 Vendors by Performance:**\n${vendors?.map((v: any, i: number) => `${i + 1}. **${v.name}** - ${v.max_daily_streams?.toLocaleString()} daily streams, $${v.cost_per_1k_streams}/1k`).join('\n')}`,
      data: vendors
    };
  }

  // Campaign count queries
  if (lowerQuery.includes('how many') && lowerQuery.includes('campaign')) {
    const { data: campaigns } = await supabase
      .from('campaign_groups')
      .select('status, total_goal');
    
    const total = campaigns?.length || 0;
    const active = campaigns?.filter((c: any) => c.status === 'Active').length || 0;
    const over100k = campaigns?.filter((c: any) => c.total_goal > 100000).length || 0;
    
    if (lowerQuery.includes('100') || lowerQuery.includes('100k')) {
      return {
        answer: `There are **${over100k} campaigns with over 100,000 streams** in the system.\n\n**Campaign Breakdown:**\n- Total Campaigns: ${total}\n- Active: ${active}\n- Over 100k streams: ${over100k}\n- Completed: ${campaigns?.filter((c: any) => c.status === 'Complete').length || 0}`,
        data: campaigns?.filter((c: any) => c.total_goal > 100000)
      };
    }
    
    return {
      answer: `You currently have **${total} total campaigns**, with **${active} active** campaigns.\n\n**Status Breakdown:**\n- Active: ${active}\n- Draft: ${campaigns?.filter((c: any) => c.status === 'Draft').length || 0}\n- Pending: ${campaigns?.filter((c: any) => c.status === 'Pending').length || 0}\n- Complete: ${campaigns?.filter((c: any) => c.status === 'Complete').length || 0}`,
      data: campaigns
    };
  }

  // Cost queries
  if (lowerQuery.includes('cost') || lowerQuery.includes('price')) {
    if (lowerQuery.includes('club restricted')) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('*')
        .ilike('name', '%club restricted%')
        .single();
      
      return {
        answer: `**Club Restricted's** average cost is **$${vendor?.cost_per_1k_streams}/1k streams**.\n\n**Additional Details:**\n- Max Daily Streams: ${vendor?.max_daily_streams?.toLocaleString()}\n- Active Campaigns: ${vendor?.max_concurrent_campaigns}\n- Status: ${vendor?.is_active ? 'Active ✅' : 'Inactive ⚠️'}`,
        data: [vendor]
      };
    }

    // Average cost across all vendors
    const { data: vendors } = await supabase
      .from('vendors')
      .select('cost_per_1k_streams');
    
    const avgCost = vendors?.reduce((sum: number, v: any) => sum + parseFloat(v.cost_per_1k_streams), 0) / (vendors?.length || 1);
    
    return {
      answer: `The **average cost across all vendors is $${avgCost.toFixed(2)}/1k streams**.\n\n**Cost Range:**\n- Lowest: $${Math.min(...vendors?.map((v: any) => parseFloat(v.cost_per_1k_streams)) || [0]).toFixed(2)}\n- Highest: $${Math.max(...vendors?.map((v: any) => parseFloat(v.cost_per_1k_streams)) || [0]).toFixed(2)}\n- Average: $${avgCost.toFixed(2)}`,
      data: vendors
    };
  }

  // Client queries
  if (lowerQuery.includes('client') && lowerQuery.includes('most')) {
    const { data: clients } = await supabase
      .from('clients')
      .select(`
        *,
        campaign_groups (id, status)
      `);
    
    const clientsWithCounts = clients?.map((c: any) => ({
      ...c,
      total_campaigns: c.campaign_groups?.length || 0,
      active_campaigns: c.campaign_groups?.filter((cg: any) => cg.status === 'Active').length || 0
    })).sort((a: any, b: any) => b.active_campaigns - a.active_campaigns);
    
    const top5 = clientsWithCounts?.slice(0, 5);
    
    return {
      answer: `**Top 5 Clients by Active Campaigns:**\n\n${top5?.map((c: any, i: number) => `${i + 1}. **${c.name}** - ${c.active_campaigns} active campaigns (${c.total_campaigns} total)`).join('\n')}`,
      data: top5
    };
  }

  // Default response for unmatched queries
  return {
    answer: `I can help you analyze:\n\n• **Vendor Performance** - "Which vendor is the best?" or "Compare vendors"\n• **Campaign Metrics** - "How many campaigns over 100k?" or "Show active campaigns"\n• **Cost Analysis** - "What's Club Restricted's cost?" or "Average vendor cost"\n• **Client Stats** - "Which clients have the most campaigns?"\n\nTry asking one of these questions!`,
    data: []
  };
}

export default async function aiAnalyticsSimpleRoutes(fastify: FastifyInstance) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Simplified AI Analytics (no embeddings required)
  fastify.post<AIAnalyticsRequest>('/ai-analytics', async (request: FastifyRequest<AIAnalyticsRequest>, reply: FastifyReply) => {
    try {
      const { query } = request.body;

      if (!query) {
        return reply.code(400).send({ error: 'Query is required' });
      }

      console.log(`🤖 AI Analytics query: "${query}"`);

      const result = await analyzeQuery(query, supabase);

      return reply.send(result);

    } catch (error: any) {
      console.error('Error in AI analytics endpoint:', error);
      return reply.code(500).send({ 
        error: 'Internal server error', 
        message: error.message 
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
        mode: 'pattern-matching' // Not using embeddings yet
      });
    } catch (error: any) {
      return reply.code(500).send({
        status: 'error',
        message: error.message
      });
    }
  });
}

