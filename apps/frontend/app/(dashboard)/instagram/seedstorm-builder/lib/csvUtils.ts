import Papa from 'papaparse';
import { Creator, Campaign } from './types';
import { generateUUID } from './campaignAlgorithm';
import { importCreators } from './localStorage';

export function parseCreatorCSV(file: File): Promise<Creator[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false, // Keep as strings for better parsing control
      skipEmptyLines: true,
      complete: function(results) {
        try {
          console.log('CSV parsing complete. Raw data:', results.data);
          console.log('CSV headers:', results.meta.fields);
          
          const creators: Creator[] = results.data
            .map((row: any, index: number) => {
              try {
                // Handle various possible column names from exports
                const handle = String(
                  row.instagram_handle || row.handle || row.Instagram || row.Handle || 
                  row['Instagram Handle'] || row['instagram_handle'] || row['Handle'] || 
                  row.creator_handle || row.username || ''
                ).replace('@', '').trim();
                
                if (!handle) {
                  console.warn(`Row ${index + 1}: No instagram handle found`);
                  return null;
                }

                // Parse numbers more robustly
                const parseNumber = (value: any): number => {
                  if (!value && value !== 0) return 0;
                  const str = String(value).replace(/[,\s]/g, ''); // Remove commas and spaces
                  if (str.includes('K')) return parseFloat(str.replace('K', '')) * 1000;
                  if (str.includes('M')) return parseFloat(str.replace('M', '')) * 1000000;
                  return parseFloat(str) || 0;
                };

                const parsePercent = (value: any): number => {
                  if (!value && value !== 0) return 0;
                  const str = String(value).replace('%', '');
                  return parseFloat(str) || 0;
                };

                const parseStringArray = (value: any): string[] => {
                  if (!value) return [];
                  return String(value).split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
                };

                const creator: Creator = {
                  id: generateUUID(),
                  instagram_handle: handle,
                  email: row.email || row.Email || null,
                  followers: parseNumber(row.followers || row.Followers || row.follower_count),
                  median_views_per_video: parseNumber(row.median_views_per_video || row.median_views || row.avg_views || row.views),
                  engagement_rate: parsePercent(row.engagement_rate || row.engagement || row.Engagement),
                  base_country: String(row.base_country || row.country || row.Country || 'US'),
                  audience_countries: [
                    row.audience_country_1 || row.base_country || row.country || 'US',
                    row.audience_country_2,
                    row.audience_country_3
                  ].filter(Boolean),
                  content_types: parseStringArray(row.content_types || row.content_type || row.Content_Types || 'DJ Footage'),
                  music_genres: parseStringArray(row.music_genres || row.genres || row.Music_Genres || 'House'),
                  reel_rate: parseNumber(row.reel_rate || row.reels_rate || row.Reel_Rate),
                  carousel_rate: parseNumber(row.carousel_rate || row.Carousel_Rate),
                  story_rate: parseNumber(row.story_rate || row.stories_rate || row.Story_Rate),
                  performance_score: parseNumber(row.performance_score || row.score) || 1.0,
                  campaignFitScore: parseNumber(row.campaign_fit_score || row.fit_score) || 0,
                  created_at: new Date().toISOString()
                };

                console.log(`Parsed creator ${index + 1}:`, creator);
                return creator;
              } catch (error) {
                console.error(`Error parsing row ${index + 1}:`, error, row);
                return null;
              }
            })
            .filter((creator): creator is Creator => creator !== null); // Type-safe filter

          console.log(`Successfully parsed ${creators.length} creators from ${results.data.length} rows`);
          resolve(creators);
        } catch (error) {
          console.error('Failed to parse CSV file:', error);
          reject(new Error('Failed to parse CSV file. Please check the format.'));
        }
      },
      error: function(error) {
        console.error('CSV parsing error:', error);
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

export function exportCampaignCSV(campaign: Campaign): void {
  const headers = [
    'Instagram Handle',
    'Followers', 
    'Median Views',
    'Engagement Rate',
    'Base Country',
    'Music Genres',
    'Content Types',
    'Selected Post Type',
    'Cost',
    'CPM',
    'Campaign Fit Score'
  ];

  const data = campaign.selected_creators.map(creator => [
    '@' + creator.instagram_handle,
    creator.followers.toLocaleString(),
    creator.median_views_per_video.toLocaleString(),
    creator.engagement_rate + '%',
    creator.base_country,
    creator.music_genres.join(', '),
    creator.content_types.join(', '),
    creator.selected_post_type || '',
    '$' + (creator.selected_rate || 0),
    '$' + (creator.median_views_per_video > 0 ? ((creator.selected_rate || creator.reel_rate || 0) / creator.median_views_per_video * 1000).toFixed(2) : '0.00'),
    (creator.campaignFitScore || 0).toFixed(1)
  ]);

  // Add totals row
  data.push([
    'TOTALS',
    campaign.totals.total_followers.toLocaleString(),
    campaign.totals.total_median_views.toLocaleString(),
    '',
    '',
    '',
    '',
    '',
    '$' + campaign.totals.total_cost.toLocaleString(),
    '$' + (campaign.totals.total_median_views > 0 ? (campaign.totals.total_cost / campaign.totals.total_median_views * 1000).toFixed(2) : '0.00'),
    ''
  ]);

  const csvContent = [headers, ...data].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  downloadCSV(csvContent, `campaign-${campaign.campaign_name}-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportCreatorsCSV(creators: Creator[]): void {
  const headers = [
    'Instagram Handle',
    'Followers',
    'Median Views',
    'Engagement Rate',
    'Base Country',
    'Audience Countries',
    'Music Genres',
    'Content Types',
    'Reel Rate',
    'Carousel Rate',
    'Story Rate',
    'Performance Score'
  ];

  const data = creators.map(creator => [
    '@' + creator.instagram_handle,
    creator.followers.toLocaleString(),
    creator.median_views_per_video.toLocaleString(),
    creator.engagement_rate + '%',
    creator.base_country,
    creator.audience_countries.join(', '),
    creator.music_genres.join(', '),
    creator.content_types.join(', '),
    '$' + creator.reel_rate,
    '$' + (creator.carousel_rate || 0),
    '$' + (creator.story_rate || 0),
    (creator.performance_score || 1.0).toFixed(2)
  ]);

  const csvContent = [headers, ...data].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  downloadCSV(csvContent, `creators-export-${new Date().toISOString().split('T')[0]}.csv`);
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Initialize with sample data if empty
export function initializeSampleData(): void {
  const creators = JSON.parse(localStorage.getItem('instagram_creators') || '[]');
  
  if (creators.length === 0) {
    const sampleCreators: Creator[] = [
      {
        id: generateUUID(),
        instagram_handle: 'djnightlife',
        followers: 125000,
        median_views_per_video: 45000,
        engagement_rate: 4.2,
        base_country: 'US',
        audience_countries: ['US', 'UK', 'Canada'],
        content_types: ['DJ Footage', 'Live Performances'],
        music_genres: ['House', 'Tech House'],
        reel_rate: 350,
        carousel_rate: 250,
        story_rate: 150,
        performance_score: 1.1,
        created_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        instagram_handle: 'musicmememaster',
        followers: 89000,
        median_views_per_video: 32000,
        engagement_rate: 5.8,
        base_country: 'UK',
        audience_countries: ['UK', 'US', 'Germany'],
        content_types: ['Music Memes', 'Lyric Videos'],
        music_genres: ['EDM', 'Pop', 'Hip-Hop'],
        reel_rate: 280,
        carousel_rate: 200,
        story_rate: 120,
        performance_score: 1.3,
        created_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        instagram_handle: 'festivalmoves',
        followers: 67000,
        median_views_per_video: 28000,
        engagement_rate: 3.9,
        base_country: 'US',
        audience_countries: ['US', 'Mexico', 'Brazil'],
        content_types: ['Festival Content', 'Dance Videos'],
        music_genres: ['Dubstep', 'Future Bass', 'Trap'],
        reel_rate: 220,
        carousel_rate: 180,
        story_rate: 100,
        performance_score: 0.9,
        created_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        instagram_handle: 'househeadvibes',
        followers: 156000,
        median_views_per_video: 62000,
        engagement_rate: 4.7,
        base_country: 'Netherlands',
        audience_countries: ['Netherlands', 'Germany', 'UK'],
        content_types: ['DJ Footage', 'Club Sets', 'Live Performances'],
        music_genres: ['Deep House', 'Afro House', 'Tech House'],
        reel_rate: 420,
        carousel_rate: 320,
        story_rate: 180,
        performance_score: 1.2,
        created_at: new Date().toISOString()
      },
      {
        id: generateUUID(),
        instagram_handle: 'technounderground',
        followers: 94000,
        median_views_per_video: 38000,
        engagement_rate: 6.1,
        base_country: 'Germany',
        audience_countries: ['Germany', 'UK', 'Netherlands'],
        content_types: ['DJ Footage', 'Club Sets'],
        music_genres: ['Techno', 'Minimal Techno', 'Industrial Techno'],
        reel_rate: 300,
        carousel_rate: 240,
        story_rate: 140,
        performance_score: 1.4,
        created_at: new Date().toISOString()
      }
    ];
    
    localStorage.setItem('instagram_creators', JSON.stringify(sampleCreators));
  }
}