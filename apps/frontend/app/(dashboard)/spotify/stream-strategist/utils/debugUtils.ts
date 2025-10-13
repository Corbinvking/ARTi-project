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
  console.log('Project: Artist Influence - Spotify Campaigns');
  console.log('URL: https://api.artistinfluence.com');
  console.log('Expected: Spotify campaign data');
}

export function validateCampaignData(campaigns: any[]) {
  if (!campaigns || campaigns.length === 0) {
    console.log('✅ No campaigns found');
    return true;
  }
  
  console.log(`✅ Campaign data loaded: ${campaigns.length} campaigns`);
  console.log('Sample campaign:', campaigns[0]);
  
  return true;
}






