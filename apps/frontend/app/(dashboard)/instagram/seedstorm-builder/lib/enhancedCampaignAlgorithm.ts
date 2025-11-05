import { Creator, CampaignForm, CampaignResults } from './types';
import { 
  useEnhancedCreatorData, 
  getMLGenreCompatibilityScore, 
  predictPerformanceWithML 
} from '../hooks/useEnhancedCreatorData';

// Re-use the genre family system from original algorithm
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

function getGenreFamily(genre: string): any {
  for (const [familyName, family] of Object.entries(GENRE_FAMILIES)) {
    if (family.genres.includes(genre)) {
      return { name: familyName, ...family };
    }
  }
  return null;
}

// Enhanced performance calculation using ML features and database performance history
function calculateEnhancedPerformanceScore(
  creator: Creator,
  enhancedData: any,
  campaignGenres: string[],
  campaignType: string,
  postType: string
): number {
  const { mlFeatures, performanceHistory, reliability_score } = enhancedData;
  
  console.log(`🧠 ML-Enhanced Performance Calculation for ${creator.instagram_handle}`);
  
  // Base score from reliability (database performance history)
  let performanceScore = reliability_score;
  console.log(`- Reliability Score (from DB): ${(reliability_score * 100).toFixed(1)}%`);
  
  if (mlFeatures) {
    // Use ML-predicted performance multiplier
    const mlMultiplier = predictPerformanceWithML(mlFeatures, campaignGenres, postType);
    performanceScore *= mlMultiplier;
    console.log(`- ML Performance Multiplier: ${mlMultiplier.toFixed(2)}x`);
    
    // Factor in consistency score
    const consistencyBonus = mlFeatures.consistency_score > 0.8 ? 1.15 : 
                            mlFeatures.consistency_score > 0.6 ? 1.0 : 0.85;
    performanceScore *= consistencyBonus;
    console.log(`- Consistency Bonus: ${consistencyBonus.toFixed(2)}x`);
    
    // Factor in recent performance trend
    if (mlFeatures.engagement_trend_slope > 0.1) {
      performanceScore *= 1.2; // Growing trend
      console.log(`- Growth Trend Bonus: +20%`);
    } else if (mlFeatures.engagement_trend_slope < -0.1) {
      performanceScore *= 0.85; // Declining trend
      console.log(`- Decline Trend Penalty: -15%`);
    }
    
    // Factor in campaign success rate
    const successRateMultiplier = 0.7 + (mlFeatures.campaign_success_rate * 0.6);
    performanceScore *= successRateMultiplier;
    console.log(`- Success Rate Multiplier: ${successRateMultiplier.toFixed(2)}x (${(mlFeatures.campaign_success_rate * 100).toFixed(1)}% success rate)`);
  } else {
    // Fallback to engagement rate and follower metrics when no ML data
    console.log(`- No ML data, using fallback metrics`);
    const viewsToFollowersRatio = creator.median_views_per_video / creator.followers;
    const engagementBonus = creator.engagement_rate > 4.0 ? 1.1 : 
                           creator.engagement_rate > 2.0 ? 1.0 : 0.9;
    const baselineScore = Math.min(viewsToFollowersRatio * 10, 1.5) * engagementBonus;
    performanceScore = Math.max(0.7, Math.min(1.3, baselineScore));
    console.log(`- Fallback Score: ${performanceScore.toFixed(2)}`);
  }
  
  // Use actual performance history if available (from post_performance_tracking)
  if (performanceHistory && performanceHistory.length > 0) {
    const recentPerformances = performanceHistory.slice(0, 5); // Last 5 posts
    const avgPerformanceRatio = recentPerformances.reduce((sum, p) => 
      sum + (p.performance_vs_prediction || 1.0), 0) / recentPerformances.length;
    
    performanceScore *= avgPerformanceRatio;
    console.log(`- Recent Performance Adjustment: ${avgPerformanceRatio.toFixed(2)}x (based on ${recentPerformances.length} recent posts)`);
  }
  
  const finalScore = Math.max(0.3, Math.min(2.0, performanceScore));
  console.log(`- Final Performance Score: ${finalScore.toFixed(2)}`);
  
  return finalScore;
}

// Enhanced CPV calculation with ML predictions
function calculateEnhancedCPV(
  creator: Creator,
  enhancedData: any,
  postType: string,
  campaignGenres: string[]
): number {
  const rate = creator[postType.toLowerCase() + '_rate'] || creator.reel_rate;
  let predictedViews = creator.median_views_per_video;
  
  const { mlFeatures, performanceHistory } = enhancedData;
  
  // Use ML-enhanced view prediction
  if (mlFeatures) {
    const performanceMultiplier = predictPerformanceWithML(mlFeatures, campaignGenres, postType);
    predictedViews = creator.median_views_per_video * performanceMultiplier;
    
    console.log(`💰 Enhanced CPV for ${creator.instagram_handle}:`);
    console.log(`- Base views: ${creator.median_views_per_video.toLocaleString()}`);
    console.log(`- ML Performance Multiplier: ${performanceMultiplier.toFixed(2)}x`);
    console.log(`- Predicted views: ${predictedViews.toLocaleString()}`);
  } else if (performanceHistory && performanceHistory.length > 0) {
    // Use recent performance history
    const recentPerformances = performanceHistory.slice(0, 3);
    const avgPerformanceRatio = recentPerformances.reduce((sum, p) => 
      sum + (p.performance_vs_prediction || 1.0), 0) / recentPerformances.length;
    
    predictedViews = creator.median_views_per_video * avgPerformanceRatio;
    console.log(`📊 CPV with performance history for ${creator.instagram_handle}: ${avgPerformanceRatio.toFixed(2)}x multiplier`);
  }
  
  const cpv = (rate / predictedViews) * 1000;
  console.log(`- Final CPV: $${cpv.toFixed(2)}`);
  
  return cpv;
}

// Enhanced genre scoring using ML genre affinity scores
function calculateEnhancedGenreScore(
  creator: Creator,
  enhancedData: any,
  campaignGenres: string[]
): number {
  const { mlFeatures, genre_affinity_scores } = enhancedData;
  
  console.log(`🎵 Enhanced Genre Scoring for ${creator.instagram_handle}`);
  console.log(`Campaign genres: [${campaignGenres.join(', ')}]`);
  console.log(`Creator genres: [${creator.music_genres.join(', ')}]`);
  
  // First try ML-based genre affinity scores
  if (mlFeatures && genre_affinity_scores && Object.keys(genre_affinity_scores).length > 0) {
    const mlScore = getMLGenreCompatibilityScore(genre_affinity_scores, campaignGenres);
    if (mlScore > 0) {
      console.log(`✅ ML Genre Affinity Score: ${mlScore.toFixed(1)}`);
      return mlScore;
    }
  }
  
  // Fallback to traditional genre family matching
  let maxScore = 0;
  let bestMatch = '';
  
  for (const campaignGenre of campaignGenres) {
    const campaignFamily = getGenreFamily(campaignGenre);
    if (!campaignFamily) continue;
    
    // Exact match gets highest score
    if (creator.music_genres.includes(campaignGenre)) {
      console.log(`✅ EXACT MATCH: Found \"${campaignGenre}\" in creator genres`);
      maxScore = Math.max(maxScore, 100);
      bestMatch = campaignGenre;
      continue;
    }
    
    // Check for family compatibility
    let genreScore = 0;
    for (const creatorGenre of creator.music_genres) {
      const creatorFamily = getGenreFamily(creatorGenre);
      
      if (!creatorFamily) continue;
      
      if (creatorFamily.name === campaignFamily.name) {
        console.log(`✅ FAMILY MATCH: \"${creatorGenre}\" matches \"${campaignGenre}\" family (${creatorFamily.name})`);
        genreScore = Math.max(genreScore, 85);
        if (genreScore > maxScore) {
          bestMatch = `${campaignGenre} via ${creatorGenre}`;
        }
      }
    }
    
    maxScore = Math.max(maxScore, genreScore);
  }
  
  console.log(`🎯 Final Genre Score: ${maxScore} (${bestMatch})`);
  return maxScore;
}

// Enhanced content type filtering using ML features
function enhancedContentTypeFilter(
  creators: Creator[],
  enhancedDataMap: Record<string, any>,
  campaignType: string,
  postType: string
): Creator[] {
  const audioSeedingTypes = [
    'Lyric Videos', 'Music Memes', 'Audio Visualizations', 'Song Covers', 'Music Videos', 'Dance Videos',
    'DJ Footage', 'Festival Content', 'EDM Memes', 'EDM Carousels', 'EDM Influencer'
  ];
  
  const footageSeedingTypes = [
    'DJ Footage', 'Festival Content', 'Live Performances', 'Music Videos', 'Club Sets', 'Studio Sessions',
    'EDM Memes', 'EDM Carousels', 'EDM Influencer'
  ];
  
  const excludeTypes = [
    'Gaming Content', 'Sports Edits', 'Fan Edits', 'Lifestyle Content', 'Tech Reviews',
    'Food Content', 'Travel Content', 'Comedy Skits', 'Educational Content',
    'Product Reviews', 'Beauty Content', 'Fashion Content', 'Fitness Content', 'Pokemon'
  ];
  
  const prioritizedTypes = campaignType === 'Audio Seeding' ? audioSeedingTypes : footageSeedingTypes;
  
  return creators.filter(creator => {
    const enhancedData = enhancedDataMap[creator.id];
    
    // Basic content type filtering (existing logic)
    if (!creator.content_types || creator.content_types.length === 0) return false;
    
    const hasExcludedContent = creator.content_types.some(type => excludeTypes.includes(type));
    if (hasExcludedContent) return false;
    
    const hasMusicContent = creator.content_types.some(type => prioritizedTypes.includes(type));
    if (!hasMusicContent) return false;
    
    // Enhanced filtering using ML features
    if (enhancedData?.mlFeatures?.content_type_distribution) {
      const distribution = enhancedData.mlFeatures.content_type_distribution;
      const postTypePerformance = distribution[postType] || 0;
      
      // Require minimum performance for the requested post type
      if (postTypePerformance < 0.3) {
        console.log(`Excluding ${creator.instagram_handle} - poor performance on ${postType} (${postTypePerformance.toFixed(2)})`);
        return false;
      }
    }
    
    // Check optimal content types if available
    if (enhancedData?.optimal_content_types?.length > 0) {
      const hasOptimalType = creator.content_types.some(type => 
        enhancedData.optimal_content_types.includes(type)
      );
      
      if (!hasOptimalType) {
        console.log(`Excluding ${creator.instagram_handle} - no optimal content types match`);
        return false;
      }
    }
    
    return true;
  });
}

// Enhanced efficiency scoring with ML insights
function calculateEnhancedEfficiencyScore(
  creator: Creator,
  enhancedData: any,
  allEligibleCreators: Creator[],
  allEnhancedDataMap: Record<string, any>,
  postType: string,
  campaignGenres: string[],
  campaignBudget: number = 0
): number {
  const trueCPV = calculateEnhancedCPV(creator, enhancedData, postType, campaignGenres);
  const { mlFeatures, reliability_score } = enhancedData;
  
  // Critical budget filtering
  if (campaignBudget < 10000 && trueCPV > 10) {
    return 0;
  }
  
  // Detect influencer type
  const isInfluencer = creator.content_types.some((type: string) => 
    type.toLowerCase().includes('influencer')
  );
  const isFacelessPage = !isInfluencer;
  
  // Get CPV range for normalization
  const allTrueCPVs = allEligibleCreators
    .map(c => calculateEnhancedCPV(allEnhancedDataMap[c.id], allEnhancedDataMap[c.id], postType, campaignGenres))
    .filter(cpv => !isNaN(cpv) && cpv > 0 && (campaignBudget >= 10000 || cpv <= 10));
  
  if (allTrueCPVs.length === 0) return isFacelessPage ? 75 : 25;
  
  const minCPV = Math.min(...allTrueCPVs);
  const maxCPV = Math.max(...allTrueCPVs);
  
  // Base tier scoring
  let baseScore = 0;
  
  if (isFacelessPage && trueCPV < 10) {
    baseScore = 85;
  } else if (isFacelessPage && trueCPV < 15 && creator.engagement_rate > 3.0) {
    baseScore = 70;
  } else if (isInfluencer && campaignBudget > 10000) {
    baseScore = 45;
  } else if (isFacelessPage) {
    baseScore = 55;
  } else {
    baseScore = 20;
  }
  
  // Enhanced scoring with ML features
  let mlBonus = 0;
  
  if (mlFeatures) {
    // Reliability bonus (from ML consistency score)
    if (mlFeatures.consistency_score > 0.8) {
      mlBonus += 10;
    } else if (mlFeatures.consistency_score < 0.5) {
      mlBonus -= 5;
    }
    
    // Performance trend bonus
    if (mlFeatures.engagement_trend_slope > 0.1) {
      mlBonus += 8; // Growing creators
    } else if (mlFeatures.engagement_trend_slope < -0.1) {
      mlBonus -= 8; // Declining creators
    }
    
    // Campaign success rate bonus
    if (mlFeatures.campaign_success_rate > 0.8) {
      mlBonus += 12;
    } else if (mlFeatures.campaign_success_rate < 0.5) {
      mlBonus -= 8;
    }
    
    // Seasonal performance bonus
    if (mlFeatures.seasonal_performance_multiplier > 1.2) {
      mlBonus += 5; // Peak season
    } else if (mlFeatures.seasonal_performance_multiplier < 0.8) {
      mlBonus -= 5; // Off season
    }
  }
  
  // Reliability score bonus (from database performance history)
  const reliabilityBonus = reliability_score > 0.8 ? 8 : 
                          reliability_score > 0.6 ? 4 : 
                          reliability_score < 0.4 ? -6 : 0;
  
  // CPV normalization
  const cpvScore = maxCPV === minCPV ? 0 : ((maxCPV - trueCPV) / (maxCPV - minCPV)) * 15;
  
  // Traditional bonuses
  const engagementBonus = creator.engagement_rate > 4.0 ? 5 : 
                         creator.engagement_rate > 2.0 ? 2 : 0;
  const costEfficiencyBonus = trueCPV < 5 ? 5 : trueCPV < 8 ? 2 : 0;
  
  const finalScore = baseScore + cpvScore + engagementBonus + costEfficiencyBonus + 
                     mlBonus + reliabilityBonus;
  
  console.log(`⚡ Enhanced Efficiency for ${creator.instagram_handle}:`);
  console.log(`- Base Score: ${baseScore}`);
  console.log(`- ML Bonus: ${mlBonus}`);
  console.log(`- Reliability Bonus: ${reliabilityBonus}`);
  console.log(`- Final Score: ${Math.min(100, finalScore).toFixed(1)}`);
  
  return Math.min(100, finalScore);
}

// Main enhanced campaign generation function
export function generateEnhancedCampaign(
  formData: CampaignForm,
  creators: Creator[],
  enhancedDataMap: Record<string, any>
): CampaignResults {
  console.log('🚀 === ENHANCED CAMPAIGN GENERATION ===');
  console.log('Total creators:', creators.length);
  console.log('Enhanced data available for:', Object.keys(enhancedDataMap).length, 'creators');
  console.log('Campaign details:', {
    type: formData.campaign_type,
    genres: formData.selected_genres,
    budget: formData.total_budget,
    post_types: formData.post_type_preference
  });
  
  const postType = formData.post_type_preference?.[0] || 'Reel';
  
  // Step 1: Enhanced content type filtering
  let eligible = enhancedContentTypeFilter(creators, enhancedDataMap, formData.campaign_type, postType);
  console.log('After enhanced content filtering:', eligible.length, 'creators remain');
  
  // Step 2: Score and sort creators
  const scoredCreators = eligible.map(creator => {
    const enhancedData = enhancedDataMap[creator.id] || {
      creator,
      performanceHistory: [],
      reliability_score: 0.5,
      genre_affinity_scores: {},
      optimal_content_types: [],
      seasonal_multiplier: 1.0
    };
    
    // Calculate enhanced scores
    const genreScore = calculateEnhancedGenreScore(creator, enhancedData, formData.selected_genres);
    const performanceScore = calculateEnhancedPerformanceScore(
      creator, enhancedData, formData.selected_genres, formData.campaign_type, postType
    );
    const efficiencyScore = calculateEnhancedEfficiencyScore(
      creator, enhancedData, eligible, enhancedDataMap, postType, formData.selected_genres, formData.total_budget
    );
    
    // Territory score (unchanged)
    const territoryScore = calculateTerritoryScore(creator, formData.territory_preferences || []);
    
    // Enhanced weighted total score
    const weightedScore = (genreScore * 0.35) + (efficiencyScore * 0.30) + 
                         (performanceScore * 100 * 0.25) + (territoryScore * 0.10);
    
    // Enhanced CPV calculation
    const enhancedCPV = calculateEnhancedCPV(creator, enhancedData, postType, formData.selected_genres);
    
    return {
      ...creator,
      genreScore,
      efficiencyScore,
      territoryScore,
      performanceScore: performanceScore * 100,
      weightedScore,
      cpv: enhancedCPV,
      campaignFitScore: weightedScore,
      selected_rate: creator[postType.toLowerCase() + '_rate'] || creator.reel_rate,
      selected_post_type: postType,
      mlEnhanced: !!enhancedDataMap[creator.id]?.mlFeatures
    };
  });
  
  // Filter by minimum genre compatibility
  const genreFiltered = scoredCreators.filter(creator => creator.genreScore >= 75);
  console.log('After genre filtering (≥75%):', genreFiltered.length, 'creators remain');
  
  if (genreFiltered.length === 0) {
    return {
      selectedCreators: [],
      totals: {
        total_creators: 0,
        total_cost: 0,
        total_followers: 0,
        total_median_views: 0,
        average_cpv: 0,
        budget_remaining: formData.total_budget,
        budget_utilization: 0
      },
      eligible: scoredCreators,
      message: "No creators found matching the strict genre requirements. Try selecting related genres or adjusting criteria."
    };
  }
  
  // Sort by weighted score (highest first)
  const sortedCreators = genreFiltered.sort((a, b) => b.weightedScore - a.weightedScore);
  
  // Budget allocation with enhanced logic
  const selectedCreators = [];
  let remainingBudget = formData.total_budget;
  let totalCost = 0;
  
  console.log('\n💰 ENHANCED BUDGET ALLOCATION:');
  
  for (const creator of sortedCreators) {
    if (selectedCreators.length >= 50) break; // Max creators limit
    
    const cost = creator.selected_rate;
    if (cost <= remainingBudget) {
      selectedCreators.push(creator);
      remainingBudget -= cost;
      totalCost += cost;
      
      console.log(`✅ Selected: ${creator.instagram_handle} - $${cost} (Score: ${creator.weightedScore.toFixed(1)}, CPV: $${creator.cpv.toFixed(2)}, ML: ${creator.mlEnhanced ? 'Yes' : 'No'})`);
    }
  }
  
  // Calculate totals
  const totals = {
    total_creators: selectedCreators.length,
    total_cost: totalCost,
    total_followers: selectedCreators.reduce((sum, c) => sum + c.followers, 0),
    total_median_views: selectedCreators.reduce((sum, c) => sum + c.median_views_per_video, 0),
    average_cpv: selectedCreators.length > 0 ? 
      selectedCreators.reduce((sum, c) => sum + c.cpv, 0) / selectedCreators.length : 0,
    budget_remaining: remainingBudget,
    budget_utilization: (totalCost / formData.total_budget) * 100
  };
  
  console.log('\n🎯 ENHANCED CAMPAIGN RESULTS:');
  console.log(`Selected ${totals.total_creators} creators`);
  console.log(`Budget utilization: ${totals.budget_utilization.toFixed(1)}%`);
  console.log(`Average CPV: $${totals.average_cpv.toFixed(2)}`);
  console.log(`ML-enhanced creators: ${selectedCreators.filter(c => c.mlEnhanced).length}`);
  
  return {
    selectedCreators,
    totals,
    eligible: sortedCreators,
    message: `Enhanced algorithm selected ${totals.total_creators} creators with ${totals.budget_utilization.toFixed(1)}% budget utilization`
  };
}

// Helper function for territory scoring (reused from original)
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

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
