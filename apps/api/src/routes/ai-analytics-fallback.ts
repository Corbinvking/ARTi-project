// Simple pattern matching fallback when LLM is not available
export async function analyzeQuerySimple(query: string, supabase: any) {
  const lowerQuery = query.toLowerCase();
  
  // Vendor queries
  if (lowerQuery.includes('vendor') && (lowerQuery.includes('best') || lowerQuery.includes('performance') || lowerQuery.includes('top'))) {
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
    const { data: vendors } = await supabase
      .from('vendors')
      .select('name, cost_per_1k_streams');
    
    const avgCost = vendors?.reduce((sum: number, v: any) => sum + parseFloat(v.cost_per_1k_streams || 0), 0) / (vendors?.length || 1);
    
    return {
      answer: `The **average cost across all vendors is $${avgCost.toFixed(2)}/1k streams**.\n\n**Cost Range:**\n- Lowest: $${Math.min(...vendors?.map((v: any) => parseFloat(v.cost_per_1k_streams || 0)) || [0]).toFixed(2)}\n- Highest: $${Math.max(...vendors?.map((v: any) => parseFloat(v.cost_per_1k_streams || 0)) || [0]).toFixed(2)}\n- Average: $${avgCost.toFixed(2)}`,
      data: vendors
    };
  }

  // Client queries
  if (lowerQuery.includes('client')) {
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

  // Playlist queries
  if (lowerQuery.includes('playlist')) {
    const { data: playlists } = await supabase
      .from('playlists')
      .select('*')
      .order('follower_count', { ascending: false })
      .limit(10);
    
    return {
      answer: `**Top 10 Playlists by Followers:**\n\n${playlists?.map((p: any, i: number) => `${i + 1}. **${p.name}** - ${p.follower_count?.toLocaleString()} followers`).join('\n')}`,
      data: playlists
    };
  }

  // Default response
  return {
    answer: `I can help you analyze:\n\n• **Vendor Performance** - "Which vendor is the best?" or "Compare vendors"\n• **Campaign Metrics** - "How many campaigns over 100k?" or "Show active campaigns"\n• **Cost Analysis** - "What's the average vendor cost?" or "Compare pricing"\n• **Client Stats** - "Which clients have the most campaigns?"\n• **Playlist Data** - "Show top playlists by followers"\n\n💡 **Tip:** Add your Claude or OpenAI API key to unlock full natural language queries!`,
    data: []
  };
}

