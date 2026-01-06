import { Creator, CampaignForm, CampaignResults } from './types';

// Strictly isolated genre families - NO cross-contamination allowed
const GENRE_FAMILIES = {
  HOUSE_FAMILY: {
    genres: ['House', 'Deep House', 'Tech House', 'Progressive House', 'Afro House', 'AfroHouse', 'Electro House', 'Progressive']
  },
  TRANCE_FAMILY: {
    genres: ['Trance', 'Uplifting Trance', 'Psytrance', 'Progressive Trance']
  },
  DUBSTEP_FAMILY: {
    genres: ['Dubstep', 'Riddim', 'Future Bass', 'Brostep']
  },
  DNB_FAMILY: {
    genres: ['DnB', 'Drum and Bass', 'Liquid DnB', 'Jump Up', 'Neurofunk']
  },
  TECHNO_FAMILY: {
    genres: ['Techno', 'Minimal Techno', 'Industrial Techno', 'Acid Techno', 'Detroit Techno']
  },
  HIPHOP_FAMILY: {
    genres: ['Hip-Hop', 'Hip Hop', 'HipHop', 'Rap', 'Trap', 'UK Drill', 'Drill', 'Conscious', 'Mumble Rap', 'Old School']
  },
  POP_FAMILY: {
    genres: ['Pop', 'Indie Pop', 'Electropop', 'Dance Pop', 'Teen Pop', 'K-Pop', 'Mainstream Pop']
  },
  ROCK_FAMILY: {
    genres: ['Rock', 'Alternative', 'Indie Rock', 'Hard Rock', 'Punk', 'Metal', 'Classic Rock']
  },
  RNB_FAMILY: {
    genres: ['R&B', 'Contemporary R&B', 'Neo Soul', 'Alternative R&B', 'Classic R&B']
  },
  LATIN_FAMILY: {
    genres: ['Latin', 'Reggaeton', 'Bachata', 'Salsa', 'Regional Mexican', 'Latin Pop', 'Merengue', 'Latin Trap']
  },
  AFRO_FAMILY: {
    genres: ['Afro', 'Afrobeats', 'Amapiano', 'Afro House', 'Afro Pop', 'Afro Drill']
  },
  REGGAE_FAMILY: {
    genres: ['Reggae', 'Dancehall', 'Reggae Fusion', 'Roots Reggae', 'Dub']
  },
  COUNTRY_FAMILY: {
    genres: ['Country', 'Modern Country', 'Country Pop', 'Folk Country', 'Americana']
  }
};

// Helper function to find which family a genre belongs to
function getGenreFamily(genre: string): any {
  for (const [familyName, family] of Object.entries(GENRE_FAMILIES)) {
    if (family.genres.includes(genre)) {
      return { name: familyName, ...family };
    }
  }
  return null;
}

// STRICT genre compatibility - NO cross-family mixing allowed
function areGenresCompatible(campaignGenre: string, creatorGenre: string): boolean {
  // Exact match is always compatible
  if (campaignGenre === creatorGenre) return true;
  
  const campaignFamily = getGenreFamily(campaignGenre);
  const creatorFamily = getGenreFamily(creatorGenre);
  
  // If either genre is not in our family system, reject
  if (!campaignFamily || !creatorFamily) return false;
  
  // ONLY same family genres are compatible - NO exceptions
  return campaignFamily.name === creatorFamily.name;
}

// Helper function to get all genres in the same family
function getRelatedGenres(genre: string): string[] {
  const family = getGenreFamily(genre);
  if (!family) return [];
  
  // Return only genres in the same family (excluding the input genre itself)
  return family.genres.filter(g => g !== genre);
}

// Enhanced performance calculation using both historical campaign data and baseline metrics
function calculateEnhancedPerformanceScore(creator: any, campaignGenre: string, campaignType: string): number {
  const performanceHistory = creator.performance_history || [];
  
  // If no historical data, use baseline median views performance indicator
  if (performanceHistory.length === 0) {
    // Use engagement rate and follower-to-views ratio as performance indicators
    const viewsToFollowersRatio = creator.median_views_per_video / creator.followers;
    const engagementBonus = creator.engagement_rate > 4.0 ? 1.1 : (creator.engagement_rate > 2.0 ? 1.0 : 0.9);
    const baselineScore = Math.min(viewsToFollowersRatio * 10, 1.5) * engagementBonus;
    return Math.max(0.7, Math.min(1.3, baselineScore)); // Keep within reasonable bounds
  }
  
  // Filter performance data relevant to this campaign type and genre
  const relevantPerformance = performanceHistory.filter((record: any) => {
    const genreMatch = record.campaign_genre === campaignGenre;
    const typeMatch = record.campaign_type === campaignType;
    return genreMatch || typeMatch;
  });
  
  // Use relevant performance if available, otherwise use overall performance
  const dataToUse = relevantPerformance.length > 0 ? relevantPerformance : performanceHistory;
  
  // Calculate weighted performance score (more recent = higher weight)
  let weightedScore = 0;
  let totalWeight = 0;
  
  dataToUse.slice(-5).forEach((record: any, index: number) => {
    const weight = index + 1; // More recent records get higher weight
    const performanceScore = record.performance_ratio || record.performance_score || 1.0; 
    weightedScore += performanceScore * weight;
    totalWeight += weight;
  });
  
  const historicalScore = totalWeight > 0 ? weightedScore / totalWeight : 1.0;
  
  // Blend historical performance with baseline metrics for creators with limited data
  if (performanceHistory.length < 3) {
    const viewsToFollowersRatio = creator.median_views_per_video / creator.followers;
    const engagementBonus = creator.engagement_rate > 4.0 ? 1.1 : (creator.engagement_rate > 2.0 ? 1.0 : 0.9);
    const baselineScore = Math.min(viewsToFollowersRatio * 10, 1.5) * engagementBonus;
    
    // Weight blend based on amount of historical data
    const historicalWeight = performanceHistory.length / 3;
    const baselineWeight = 1 - historicalWeight;
    
    return (historicalScore * historicalWeight) + (baselineScore * baselineWeight);
  }
  
  return historicalScore;
}

// Enhanced CPV calculation that accounts for actual vs predicted performance
function calculateTrueCPV(creator: any, postType: string, includePerformancePrediction = true): number {
  const rate = creator[postType.toLowerCase() + '_rate'] || creator.reel_rate;
  let predictedViews = creator.median_views_per_video;
  
  // If we have performance history, adjust predicted views
  if (includePerformancePrediction && creator.performance_history && creator.performance_history.length > 0) {
    const avgPerformanceRatio = creator.performance_history
      .slice(-3) // Use last 3 campaigns
      .reduce((sum: number, record: any) => sum + (record.performance_ratio || record.performance_score || 1.0), 0) / Math.min(creator.performance_history.length, 3);
    
    predictedViews = creator.median_views_per_video * avgPerformanceRatio;
  }
  
  return (rate / predictedViews) * 1000;
}

// Enhanced content type filtering - Updated to match actual database content types
function filterByContentType(creators: Creator[], campaignType: string): Creator[] {
  // Updated to match actual content types in your database - now more flexible
  const audioSeedingTypes = [
    'Lyric Videos', 'Music Memes', 'Audio Visualizations', 'Song Covers', 'Music Videos', 'Dance Videos',
    'DJ Footage', 'Festival Content', 'EDM Memes', 'EDM Carousels', 'EDM Influencer',
    // More flexible matching - partial strings
    'music', 'audio', 'lyric', 'song', 'dance', 'dj', 'festival', 'edm', 'beats', 'sound'
  ];
  
  const footageSeedingTypes = [
    'DJ Footage', 'Festival Content', 'Live Performances', 'Music Videos', 'Club Sets', 'Studio Sessions',
    'EDM Memes', 'EDM Carousels', 'EDM Influencer',
    // More flexible matching
    'footage', 'live', 'performance', 'video', 'club', 'studio', 'dj', 'festival'
  ];
  
  // Content types that should EXCLUDE creators from music campaigns
  const excludeTypes = [
    'Gaming Content', 
    'Sports Edits', 
    'Fan Edits',
    'Lifestyle Content',
    'Tech Reviews',
    'Food Content',
    'Travel Content',
    'Comedy Skits',
    'Educational Content',
    'Product Reviews',
    'Beauty Content',
    'Fashion Content',
    'Fitness Content',
    'Pokemon'
  ];
  
  const prioritizedTypes = campaignType === 'Audio Seeding' ? audioSeedingTypes : footageSeedingTypes;
  
  return creators.filter(creator => {
    // LENIENT: If creator has no content types, INCLUDE them (don't filter out)
    if (!creator.content_types || creator.content_types.length === 0) {
      console.log(`Including ${creator.instagram_handle} - no content types set (accepting by default)`);
      return true;
    }
    
    // EXCLUDE creators who primarily do non-music content
    const hasExcludedContent = creator.content_types.some(type => 
      excludeTypes.some(excluded => type.toLowerCase().includes(excluded.toLowerCase()))
    );
    if (hasExcludedContent) {
      console.log(`Excluding ${creator.instagram_handle} - has non-music content:`, creator.content_types);
      return false;
    }
    
    // EXCLUDE creators with obviously non-music themed handles
    const handle = creator.instagram_handle.toLowerCase();
    const nonMusicKeywords = [
      'pokemon', 'gaming', 'fortnite', 'minecraft', 'anime', 'manga',
      'sports', 'fitness', 'food', 'travel', 'fashion', 'beauty',
      'tech', 'review', 'comedy', 'cat', 'dog', 'pet',
      'car', 'auto', 'news', 'politics', 'health', 'wellness'
    ];
    
    const hasNonMusicHandle = nonMusicKeywords.some(keyword => handle.includes(keyword));
    if (hasNonMusicHandle) {
      console.log(`Excluding ${creator.instagram_handle} - non-music themed handle`);
      return false;
    }
    
    // Check for music-related content (now with partial matching)
    const hasMusicContent = creator.content_types.some(type => 
      prioritizedTypes.some(musicType => 
        type.toLowerCase().includes(musicType.toLowerCase()) || 
        musicType.toLowerCase().includes(type.toLowerCase())
      )
    );
    
    // LENIENT: If no specific match found but no excluded content either, include them
    if (!hasMusicContent) {
      console.log(`Including ${creator.instagram_handle} - content types don't match but not excluded:`, creator.content_types);
      return true; // Changed from false to true - be lenient
    }
    
    return true;
  });
}

// LENIENT genre matching with support for multiple campaign genres
function calculateGenreScore(creatorGenres: string[], campaignGenres: string[]): number {
  // If creator has no genres set, give them a default score (be lenient)
  if (!creatorGenres || creatorGenres.length === 0) {
    console.log(`✅ Creator has no genres - giving default score of 50`);
    return 50; // Default score for creators without genres
  }
  
  // If campaign has no genres set, all creators match
  if (!campaignGenres || campaignGenres.length === 0) {
    console.log(`✅ No campaign genres - all creators match with score 50`);
    return 50;
  }
  
  let maxScore = 0;
  let bestMatch = '';
  
  // Check each campaign genre against creator genres
  for (const campaignGenre of campaignGenres) {
    const campaignFamily = getGenreFamily(campaignGenre);
    if (!campaignFamily) {
      // Genre not in family system - try partial string matching
      const partialMatch = creatorGenres.some(cg => 
        cg.toLowerCase().includes(campaignGenre.toLowerCase()) ||
        campaignGenre.toLowerCase().includes(cg.toLowerCase())
      );
      if (partialMatch) {
        console.log(`✅ Partial match for "${campaignGenre}"`);
        maxScore = Math.max(maxScore, 70);
      }
      continue;
    }
    
    // EXACT MATCH gets highest score
    if (creatorGenres.includes(campaignGenre)) {
      console.log(`✅ EXACT MATCH: Found "${campaignGenre}" in creator genres`);
      maxScore = Math.max(maxScore, 100);
      bestMatch = campaignGenre;
      continue;
    }
    
    // Check for family compatibility
    let genreScore = 0;
    for (const creatorGenre of creatorGenres) {
      const creatorFamily = getGenreFamily(creatorGenre);
      
      if (!creatorFamily) {
        // Try partial matching for genres not in family system
        if (creatorGenre.toLowerCase().includes(campaignGenre.toLowerCase()) ||
            campaignGenre.toLowerCase().includes(creatorGenre.toLowerCase())) {
          console.log(`✅ Partial match: "${creatorGenre}" ~ "${campaignGenre}"`);
          genreScore = Math.max(genreScore, 70);
        }
        continue;
      }
      
      // Same family genres are compatible
      if (creatorFamily.name === campaignFamily.name) {
        console.log(`✅ FAMILY MATCH: "${creatorGenre}" matches "${campaignGenre}" family (${creatorFamily.name})`);
        genreScore = Math.max(genreScore, 85);
        if (genreScore > maxScore) {
          bestMatch = `${campaignGenre} via ${creatorGenre}`;
        }
      }
    }
    
    maxScore = Math.max(maxScore, genreScore);
  }
  
  // If no specific match found, give a small default score so creators aren't excluded
  if (maxScore === 0) {
    console.log(`⚠️ No genre match found, giving default score of 30`);
    return 30; // Low but not zero - creator won't be excluded
  }
  
  if (maxScore > 0) {
    console.log(`✅ FINAL SCORE: ${maxScore} (best match: ${bestMatch})`);
  }
  
  return maxScore;
}

// Territory matching
function calculateTerritoryScore(creator: Creator, territoryPreferences: string[]): number {
  if (!territoryPreferences || territoryPreferences.length === 0) {
    return 50;
  }
  
  let maxScore = 0;
  
  territoryPreferences.forEach(preference => {
    if (preference === 'US Primary') {
      if (creator.audience_countries[0] === 'US') maxScore = Math.max(maxScore, 100);
      else if (creator.audience_countries.includes('US')) maxScore = Math.max(maxScore, 70);
      else maxScore = Math.max(maxScore, 30);
    }
    
    if (preference === 'UK Primary') {
      if (creator.audience_countries[0] === 'UK') maxScore = Math.max(maxScore, 100);
      else if (creator.audience_countries.includes('UK')) maxScore = Math.max(maxScore, 70);
      else maxScore = Math.max(maxScore, 30);
    }
    
    if (preference === 'Europe Focus') {
      const europeanCountries = ['UK', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands'];
      if (europeanCountries.includes(creator.audience_countries[0])) maxScore = Math.max(maxScore, 100);
      else if (creator.audience_countries.some(country => europeanCountries.includes(country))) maxScore = Math.max(maxScore, 70);
      else maxScore = Math.max(maxScore, 40);
    }
    
    if (preference === 'Global' || preference === 'No Preference') {
      maxScore = Math.max(maxScore, 75);
    }
  });
  
  return maxScore;
}

// Enhanced efficiency calculation with proper influencer detection and CPV prioritization
function calculateEfficiencyScore(creator: any, allEligibleCreators: any[], postType: string, campaignBudget: number = 0): number {
  const trueCPV = calculateTrueCPV(creator, postType, true);
  creator.cpv = trueCPV;
  creator.baseline_cpv = calculateTrueCPV(creator, postType, false);
  
  // CRITICAL: Exclude high-cost creators for small budgets
  if (campaignBudget < 10000 && trueCPV > 10) {
    return 0; // Reject creators with CPV >$10 for budgets under $10K
  }
  
  // IMPROVED: Detect influencers by checking for "influencer" in any content type (case-insensitive)
  const isInfluencer = creator.content_types.some((type: string) => 
    type.toLowerCase().includes('influencer')
  );
  const isFacelessPage = !isInfluencer;
  
  // Get all true CPVs for normalization (excluding rejected high-cost ones)
  const allTrueCPVs = allEligibleCreators
    .map(c => calculateTrueCPV(c, postType, true))
    .filter(cpv => !isNaN(cpv) && cpv > 0 && (campaignBudget >= 10000 || cpv <= 10));
  
  if (allTrueCPVs.length === 0) return isFacelessPage ? 75 : 25;
  
  const minCPV = Math.min(...allTrueCPVs);
  const maxCPV = Math.max(...allTrueCPVs);
  
  if (maxCPV === minCPV) return isFacelessPage ? 75 : 25;
  
  // TIER-BASED PRIORITIZATION SYSTEM
  let baseScore = 0;
  
  if (isFacelessPage && trueCPV < 10) {
    // TIER 1: Faceless pages with CPV <$10 - HIGHEST PRIORITY
    baseScore = 85;
  } else if (isFacelessPage && trueCPV < 15 && creator.engagement_rate > 3.0) {
    // TIER 2: High-performing faceless pages with CPV <$15 - HIGH PRIORITY
    baseScore = 70;
  } else if (isInfluencer && campaignBudget > 10000) {
    // TIER 3: Influencers only for large budgets (>$10K) - LOWER PRIORITY
    baseScore = 45;
  } else if (isFacelessPage) {
    // TIER 4: Other faceless pages - MEDIUM PRIORITY
    baseScore = 55;
  } else {
    // TIER 5: Influencers with small budgets - LOWEST PRIORITY
    baseScore = 20;
  }
  
  // Normalize CPV within tier for fine-tuning
  const cpvScore = ((maxCPV - trueCPV) / (maxCPV - minCPV)) * 15; // Smaller impact for fine-tuning
  
  // Additional bonuses
  const engagementBonus = creator.engagement_rate > 4.0 ? 5 : (creator.engagement_rate > 2.0 ? 2 : 0);
  const costEfficiencyBonus = trueCPV < 5 ? 5 : (trueCPV < 8 ? 2 : 0);
  
  const finalScore = baseScore + cpvScore + engagementBonus + costEfficiencyBonus;
  
  // Debug logging for test cases
  if (creator.instagram_handle?.toLowerCase().includes('tatum') || trueCPV > 14) {
    console.log(`💰 CPV PRIORITY DEBUG - ${creator.instagram_handle}: CPV=$${trueCPV.toFixed(2)}, isFaceless=${isFacelessPage}, isInfluencer=${isInfluencer}, baseScore=${baseScore}, finalScore=${finalScore.toFixed(1)}`);
  }
  
  return Math.min(100, finalScore);
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Main campaign generation function optimized for best CPV
export function generateCampaign(formData: CampaignForm, creators: Creator[]): CampaignResults {
  console.log('=== CAMPAIGN GENERATION DEBUG ===');
  console.log('Total creators received:', creators.length);
  console.log('Campaign type:', formData.campaign_type);
  console.log('Selected genres:', formData.selected_genres);
  console.log('Budget:', formData.total_budget);
  console.log('Post type preferences:', formData.post_type_preference);
  
  // Debug: Show some sample creators and their data
  console.log('Sample creator data:');
  creators.slice(0, 5).forEach(creator => {
    console.log(`- ${creator.instagram_handle}:`, {
      genres: creator.music_genres,
      content_types: creator.content_types,
      reel_rate: creator.reel_rate,
      followers: creator.followers,
      median_views: creator.median_views_per_video
    });
  });
  
  // Step 1: Filter by content type
  let eligible = filterByContentType(creators, formData.campaign_type);
  console.log('After content type filter:', eligible.length, 'creators remain');
  console.log('Filtered out creators:', creators.length - eligible.length);
  
  // Step 1.5: LENIENT GENRE FILTERING - Only filter if campaign has genres AND creators have genres
  console.log('\n=== APPLYING LENIENT MULTI-GENRE FILTER ===');
  const beforeGenreFilter = eligible.length;
  
  // Only apply genre filtering if campaign has specific genre preferences
  if (formData.selected_genres && formData.selected_genres.length > 0) {
    eligible = eligible.filter(creator => {
      // If creator has no genres set, INCLUDE them (don't filter out)
      if (!creator.music_genres || creator.music_genres.length === 0) {
        console.log(`✅ GENRE ACCEPTED: ${creator.instagram_handle} - no genres set (accepting by default)`);
        return true;
      }
      
      const genreScore = calculateGenreScore(creator.music_genres, formData.selected_genres);
      const isCompatible = genreScore > 0;
      
      if (!isCompatible) {
        console.log(`🚫 GENRE REJECTED: ${creator.instagram_handle} - genres [${creator.music_genres.join(', ')}] incompatible with campaign genres [${formData.selected_genres.join(', ')}]`);
      }
      
      return isCompatible;
    });
  } else {
    console.log('No campaign genres selected - skipping genre filter');
  }
  console.log(`After genre filter: ${eligible.length} creators remain (filtered out ${beforeGenreFilter - eligible.length})`);
  
  // Step 2: Add default rates for creators without proper rates (don't filter them out)
  const primaryPostType = formData.post_type_preference[0] || 'reel';
  console.log('Primary post type:', primaryPostType);
  
  const beforeRateFilter = eligible.length;
  eligible = eligible.map(creator => {
    const rate = creator[primaryPostType.toLowerCase() + '_rate'] || creator.reel_rate;
    const hasValidRate = rate && rate > 0;
    const hasValidViews = creator.median_views_per_video && creator.median_views_per_video > 0;
    const hasValidFollowers = creator.followers && creator.followers > 0;
    
    // If missing data, set defaults instead of filtering out
    if (!hasValidRate || !hasValidViews || !hasValidFollowers) {
      console.log(`⚠️ Setting defaults for ${creator.instagram_handle}: rate=${rate || 'missing'}, views=${creator.median_views_per_video || 'missing'}, followers=${creator.followers || 'missing'}`);
      return {
        ...creator,
        reel_rate: rate || 100, // Default rate of $100
        story_rate: creator.story_rate || 50,
        post_rate: creator.post_rate || 150,
        median_views_per_video: creator.median_views_per_video || creator.followers * 0.1 || 1000, // 10% of followers or 1000
        followers: creator.followers || 10000 // Default 10k followers
      };
    }
    
    return creator;
  });
  console.log('After adding defaults for missing data:', eligible.length, 'creators remain');
  
  if (eligible.length === 0) {
    console.log('❌ NO CREATORS FOUND after strict content and genre filtering');
    
    // Provide helpful debugging information
    let debugMessage = `No eligible creators found. `;
    
    if (creators.length === 0) {
      debugMessage += `No creators in database. Please add creators first.`;
    } else {
      const creatorsWithRates = creators.filter(c => (c.reel_rate && c.reel_rate > 0));
      const creatorsWithGenres = creators.filter(c => c.music_genres && c.music_genres.length > 0);
      const creatorsWithContent = creators.filter(c => c.content_types && c.content_types.length > 0);
      
      debugMessage += `Database has ${creators.length} creators total. `;
      debugMessage += `${creatorsWithRates.length} have valid rates, `;
      debugMessage += `${creatorsWithGenres.length} have genres, `;
      debugMessage += `${creatorsWithContent.length} have content types. `;
      debugMessage += `Selected genres: ${formData.selected_genres.join(', ')}. `;
      debugMessage += `Try adding creators with matching genres or check rate data.`;
    }
    
    return {
      selectedCreators: [],
      totals: { 
        total_creators: 0, 
        total_cost: 0, 
        total_followers: 0, 
        total_median_views: 0,
        average_cpv: 0,
        budget_remaining: formData.total_budget
      },
      eligible: [],
      message: debugMessage
    };
  }
  
  console.log('Final eligible creators:', eligible.map(c => ({ 
    handle: c.instagram_handle, 
    genres: c.music_genres, 
    content_types: c.content_types,
    rate: c[primaryPostType.toLowerCase() + '_rate'] || c.reel_rate
  })));
  
  // Step 2: Calculate enhanced scores prioritizing CPV optimization
  eligible = eligible.map(creator => {
    const genreScore = calculateGenreScore(creator.music_genres, formData.selected_genres);
    const territoryScore = calculateTerritoryScore(creator, formData.territory_preferences);
    const efficiencyScore = calculateEfficiencyScore(creator, eligible, primaryPostType, formData.total_budget);
    
    // Use enhanced performance score that considers both campaign history and baseline metrics
    const enhancedPerformanceMultiplier = calculateEnhancedPerformanceScore(
      creator, 
      formData.selected_genres[0] || 'Unknown', // Use first selected genre for performance tracking
      formData.campaign_type
    );
    
    // Weight efficiency more heavily for best CPV optimization - Handle NaN values
    const safeGenreScore = isNaN(genreScore) ? 0 : genreScore;
    const safeEfficiencyScore = isNaN(efficiencyScore) ? 0 : efficiencyScore;
    const safeTerritoryScore = isNaN(territoryScore) ? 50 : territoryScore;
    const safePerformanceMultiplier = isNaN(enhancedPerformanceMultiplier) ? 1.0 : enhancedPerformanceMultiplier;
    
    const baseFitScore = (safeGenreScore * 0.25) + (safeEfficiencyScore * 0.5) + (safeTerritoryScore * 0.15) + (10 * 0.1);
    const finalScore = baseFitScore * safePerformanceMultiplier;
    
    return {
      ...creator,
      campaignFitScore: isNaN(finalScore) ? 0 : finalScore,
      enhancedPerformanceScore: safePerformanceMultiplier,
      selected_rate: creator[primaryPostType.toLowerCase() + '_rate'] || creator.reel_rate,
      selected_post_type: primaryPostType,
      predicted_views_adjusted: creator.median_views_per_video * safePerformanceMultiplier,
      posts_count: 1 // Initialize with 1 post per creator
    };
  });
  
  console.log('Sample scored creators:', eligible.slice(0, 5).map(c => ({ 
    handle: c.instagram_handle, 
    score: c.campaignFitScore, 
    cpv: c.cpv,
    genre_score: calculateGenreScore(c.music_genres, formData.selected_genres),
    territory_score: calculateTerritoryScore(c, formData.territory_preferences)
  })));
  
  // Step 3: Sort by campaign fit score with randomization for similar scores
  eligible.sort((a, b) => {
    const scoreDiff = b.campaignFitScore - a.campaignFitScore;
    // If scores are very close (within 5 points), add some randomization
    if (Math.abs(scoreDiff) < 5) {
      return Math.random() - 0.5;
    }
    return scoreDiff;
  });
  
  console.log('Top 10 creators after sorting:', eligible.slice(0, 10).map(c => ({ 
    handle: c.instagram_handle, 
    score: c.campaignFitScore,
    rate: c.selected_rate
  })));
  
  // Step 4: Select creators within budget, optimizing for best overall CPV
  const selected = [];
  let remainingBudget = formData.total_budget;
  
  // First pass: select top performers that fit budget
  for (const creator of eligible) {
    if (creator.selected_rate <= remainingBudget) {
      selected.push(creator);
      remainingBudget -= creator.selected_rate;
    }
  }
  
  console.log('Selected creators:', selected.map(c => ({ handle: c.instagram_handle, rate: c.selected_rate })));
  
  // Step 5: Calculate comprehensive totals including predicted performance
  const validCreatorsForCPV = selected.filter(c => c.cpv && c.cpv > 0 && !isNaN(c.cpv) && c.cpv !== Infinity);
  const totalPosts = selected.reduce((sum, c) => sum + (c.posts_count || 1), 0);
  const totalCost = selected.reduce((sum, c) => sum + ((c.selected_rate || 0) * (c.posts_count || 1)), 0);
  
  const totals = {
    total_creators: selected.length,
    total_posts: totalPosts,
    total_cost: totalCost,
    total_followers: selected.reduce((sum, c) => sum + (c.followers || 0), 0),
    total_median_views: selected.reduce((sum, c) => sum + ((c.median_views_per_video || 0) * (c.posts_count || 1)), 0),
    total_predicted_views: selected.reduce((sum, c) => sum + ((c.predicted_views_adjusted || c.median_views_per_video || 0) * (c.posts_count || 1)), 0),
    baseline_cpv: validCreatorsForCPV.length > 0 ? validCreatorsForCPV.reduce((sum, c) => sum + (c.baseline_cpv || 0), 0) / validCreatorsForCPV.length : 0,
    predicted_cpv: validCreatorsForCPV.length > 0 ? validCreatorsForCPV.reduce((sum, c) => sum + (c.cpv || 0), 0) / validCreatorsForCPV.length : 0,
    average_cpv: validCreatorsForCPV.length > 0 ? validCreatorsForCPV.reduce((sum, c) => sum + (c.cpv || 0), 0) / validCreatorsForCPV.length : 0,
    budget_remaining: formData.total_budget - totalCost,
    budget_utilization: (totalCost / formData.total_budget) * 100
  };
  
  // Step 6: Generate CPV-focused recommendations
  const recommendations = [];
  
  if (totals.budget_utilization < 85) {
    const suggestedIncrease = Math.ceil(remainingBudget * 0.6);
    recommendations.push(`Consider increasing budget by $${suggestedIncrease} to include more high-performing creators and improve overall CPV`);
  }
  
  if (totals.predicted_cpv > 25) {
    recommendations.push('Current selection has higher CPV - consider adjusting territory or genre preferences for better value');
  }
  
  if (selected.length < 5) {
    recommendations.push('Consider broadening genre or territory preferences to include more creators and improve reach');
  }
  
  const topPerformers = selected.filter(c => c.enhancedPerformanceScore > 1.1).length;
  if (topPerformers > 0) {
    recommendations.push(`${topPerformers} creator(s) selected have proven above-average performance based on historical data`);
  }
  
  // Limit eligible creators based on budget to show reasonable alternatives
  const maxCreatorsToShow = Math.max(
    Math.min(30, Math.ceil(formData.total_budget / 50)), // At least 1 creator per $50 budget, max 30
    selected.length + 10 // At least 10 more than selected
  );
  
  return {
    selectedCreators: selected,
    totals,
    recommendations,
    eligible: eligible.slice(0, maxCreatorsToShow)
  };
}

// Update creator performance when campaign results are added
export function updateCreatorPerformanceFromResults(creatorId: string, campaignResults: any, campaignData: any): void {
  const creators = JSON.parse(localStorage.getItem('creators') || '[]');
  const creator = creators.find((c: Creator) => c.id === creatorId);
  
  if (!creator) return;

  if (!creator.performance_history) {
    creator.performance_history = [];
  }
  
  // Calculate performance metrics using baseline median views
  const predictedViews = creator.median_views_per_video;
  const actualViews = campaignResults.actual_views;
  const performanceRatio = actualViews / predictedViews;
  
  // Add new performance record with enhanced tracking
  const newRecord = {
    date: new Date().toISOString(),
    campaign_id: campaignData.id,
    campaign_genre: campaignData.form_data.primary_genre,
    campaign_type: campaignData.form_data.campaign_type,
    predicted_views: predictedViews,
    actual_views: actualViews,
    performance_ratio: performanceRatio,
    actual_engagement_rate: campaignResults.actual_engagement_rate,
    satisfaction_rating: campaignResults.satisfaction_rating || 8,
    actual_cpv: (campaignResults.cost_paid || campaignResults.selected_rate || creator.reel_rate) / actualViews * 1000,
    performance_score: performanceRatio // For backward compatibility
  };
  
  creator.performance_history.push(newRecord);
  
  // Keep only last 10 records
  if (creator.performance_history.length > 10) {
    creator.performance_history = creator.performance_history.slice(-10);
  }
  
  // Update overall performance score using both views and engagement
  const recentPerformance = creator.performance_history.slice(-5);
  const avgPerformanceRatio = recentPerformance.reduce((sum, record: any) => sum + (record.performance_ratio || record.performance_score || 1.0), 0) / recentPerformance.length;
  const avgSatisfaction = recentPerformance.reduce((sum, record: any) => sum + ((record.satisfaction_rating || 8) / 10), 0) / recentPerformance.length;
  
  creator.performance_score = (avgPerformanceRatio * 0.7) + (avgSatisfaction * 0.3);
  
  localStorage.setItem('creators', JSON.stringify(creators));
}

// Save completed campaign results and update creator performance
export function saveCompletedCampaignResults(campaignId: string, resultsData: any): void {
  const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
  const campaign = campaigns.find((c: any) => c.id === campaignId);
  
  if (!campaign) return;
  
  // Update campaign with actual results
  campaign.actual_results = {
    executed: true,
    creator_results: resultsData.creator_results,
    overall_satisfaction: resultsData.overall_satisfaction,
    total_actual_views: resultsData.creator_results.reduce((sum: number, cr: any) => sum + cr.actual_views, 0),
    total_actual_cost: resultsData.creator_results.reduce((sum: number, cr: any) => sum + (cr.cost_paid || cr.selected_rate), 0),
    actual_average_cpv: resultsData.creator_results.reduce((sum: number, cr: any) => sum + ((cr.cost_paid || cr.selected_rate) / cr.actual_views * 1000), 0) / resultsData.creator_results.length,
    date_completed: new Date().toISOString()
  };
  
  // Update each creator's performance history
  resultsData.creator_results.forEach((creatorResult: any) => {
    updateCreatorPerformanceFromResults(
      creatorResult.creator_id, 
      creatorResult, 
      campaign
    );
  });
  
  campaign.status = 'Completed';
  localStorage.setItem('campaigns', JSON.stringify(campaigns));
}

// Legacy function for backward compatibility
export function updateCreatorPerformance(
  creatorId: string, 
  actualResults: { views: number; engagement: number; satisfaction: number }, 
  predictedResults: { views: number; engagement: number }
): void {
  const campaignResults = {
    actual_views: actualResults.views,
    actual_engagement_rate: actualResults.engagement,
    satisfaction_rating: actualResults.satisfaction
  };
  
  const campaignData = {
    id: generateUUID(),
    form_data: {
      primary_genre: 'Unknown',
      campaign_type: 'Audio Seeding'
    }
  };
  
  updateCreatorPerformanceFromResults(creatorId, campaignResults, campaignData);
}