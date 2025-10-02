// Debug utilities for troubleshooting cache and connection issues

export function clearBrowserCache() {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage  
    sessionStorage.clear();
    
    // Clear React Query cache keys related to campaigns
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('campaign') || key.includes('client') || key.includes('react-query'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('🧹 Browser cache cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
}

export function logCurrentProject() {
  console.log('🔍 Current Supabase Project Details:');
  console.log('Project ID: mwtrdhnctzasddbeilwm');
  console.log('URL: https://mwtrdhnctzasddbeilwm.supabase.co');
  console.log('Expected: Instagram promotion campaigns, NOT Spotify campaigns');
}

export function validateCampaignData(campaigns: any[]) {
  if (!campaigns || campaigns.length === 0) {
    console.log('✅ No campaigns found');
    return true;
  }
  
  // Check for wrong source/campaign_type - expecting Instagram campaigns from campaign_manager/campaign_intake
  const wrongSource = campaigns.filter(campaign => 
    !['campaign_manager', 'campaign_intake'].includes(campaign.source) || campaign.campaign_type !== 'instagram'
  );
  
  if (wrongSource.length > 0) {
    console.error('❌ WRONG PROJECT DATA - Incorrect source/campaign_type:');
    wrongSource.forEach(campaign => {
      console.error(`- ${campaign.name} (source: ${campaign.source}, type: ${campaign.campaign_type})`);
    });
    return false;
  }
  
  // Check for suspicious Spotify keywords (indicating wrong project data)
  const suspiciousKeywords = ['spotify', 'streams', 'playlist', 'artist_influence_spotify'];
  const suspicious = campaigns.filter(campaign => 
    suspiciousKeywords.some(keyword => 
      campaign.name?.toLowerCase().includes(keyword) || 
      campaign.source?.toLowerCase().includes(keyword) ||
      campaign.campaign_type?.toLowerCase().includes(keyword)
    )
  );
  
  if (suspicious.length > 0) {
    console.warn('⚠️ SUSPICIOUS CAMPAIGN DATA DETECTED:');
    console.warn('Found campaigns with Spotify-related keywords (wrong project data):');
    suspicious.forEach(campaign => {
      console.warn(`- ${campaign.name} (ID: ${campaign.id}) - Source: ${campaign.source}, Type: ${campaign.campaign_type}`);
    });
    return false;
  }
  
  console.log('✅ Campaign data appears correct for Instagram promotion project');
  return true;
}






