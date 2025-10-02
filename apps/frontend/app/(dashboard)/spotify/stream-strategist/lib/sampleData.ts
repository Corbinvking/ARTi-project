import { supabase } from "../integrations/supabase/client";
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from "./constants";

export async function insertSampleData() {
  try {
    // Check if data already exists
    const { data: existingVendors } = await supabase
      .from('vendors')
      .select('id')
      .limit(1);

    if (existingVendors && existingVendors.length > 0) {
      console.log('Sample data already exists, adding performance data if missing');
      await insertPerformanceData();
      return;
    }

    // Insert sample vendors with is_active: true (default from migration)
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .insert([
        {
          name: "Spotify Curators Co.",
          max_daily_streams: 50000,
          is_active: true
        },
        {
          name: "Indie Music Network",
          max_daily_streams: 75000,
          is_active: true
        },
        {
          name: "Electronic Vibes",
          max_daily_streams: 30000,
          is_active: true
        },
        {
          name: "Hip-Hop Central",
          max_daily_streams: 60000,
          is_active: true
        }
      ])
      .select();

    if (vendorError) throw vendorError;

    // Insert sample playlists
    const playlists = [
      // Spotify Curators Co. playlists
      {
        vendor_id: vendors[0].id,
        name: "Indie Rock Rising",
        url: "https://open.spotify.com/playlist/indie-rock-rising",
        genres: ["indie", "rock", "alternative"],
        avg_daily_streams: 12000
      },
      {
        vendor_id: vendors[0].id,
        name: "Chill Study Vibes",
        url: "https://open.spotify.com/playlist/chill-study-vibes",
        genres: ["chill", "lo-fi", "study"],
        avg_daily_streams: 18000
      },
      // Indie Music Network playlists
      {
        vendor_id: vendors[1].id,
        name: "Emerging Artists",
        url: "https://open.spotify.com/playlist/emerging-artists",
        genres: ["indie", "singer-songwriter", "folk"],
        avg_daily_streams: 25000
      },
      {
        vendor_id: vendors[1].id,
        name: "Bedroom Pop Paradise",
        url: "https://open.spotify.com/playlist/bedroom-pop-paradise",
        genres: ["bedroom-pop", "indie", "dreamy"],
        avg_daily_streams: 20000
      },
      {
        vendor_id: vendors[1].id,
        name: "Acoustic Coffee Shop",
        url: "https://open.spotify.com/playlist/acoustic-coffee-shop",
        genres: ["acoustic", "folk", "coffee-shop"],
        avg_daily_streams: 15000
      },
      // Electronic Vibes playlists
      {
        vendor_id: vendors[2].id,
        name: "Future Bass Central",
        url: "https://open.spotify.com/playlist/future-bass-central",
        genres: ["future-bass", "electronic", "edm"],
        avg_daily_streams: 22000
      },
      {
        vendor_id: vendors[2].id,
        name: "Synthwave Nights",
        url: "https://open.spotify.com/playlist/synthwave-nights",
        genres: ["synthwave", "retro", "electronic"],
        avg_daily_streams: 8000
      },
      // Hip-Hop Central playlists
      {
        vendor_id: vendors[3].id,
        name: "Underground Hip-Hop",
        url: "https://open.spotify.com/playlist/underground-hip-hop",
        genres: ["hip-hop", "underground", "rap"],
        avg_daily_streams: 30000
      },
      {
        vendor_id: vendors[3].id,
        name: "Trap & Bass",
        url: "https://open.spotify.com/playlist/trap-bass",
        genres: ["trap", "bass", "hip-hop"],
        avg_daily_streams: 28000
      }
    ];

    const { error: playlistError } = await supabase
      .from('playlists')
      .insert(playlists);

    if (playlistError) throw playlistError;

    // Insert sample campaigns
    const { error: campaignError } = await supabase
      .from('campaigns')
      .insert([
        {
          name: "New Artist Launch - Electronic Single",
          brand_name: "Neon Dreams Records",
          client: "Neon Dreams Records",
          track_url: "https://open.spotify.com/track/example1",
          stream_goal: 100000,
          remaining_streams: 85000,
          budget: 2500,
          sub_genre: "electronic",
          start_date: "2024-01-15",
          duration_days: 90,
          status: "active",
          source: APP_CAMPAIGN_SOURCE,
          campaign_type: APP_CAMPAIGN_TYPE,
          music_genres: ["electronic"],
          content_types: ["single"],
          territory_preferences: ["US", "UK"],
          post_types: ["playlist"]
        }
      ]);

    if (campaignError) throw campaignError;

    await insertPerformanceData();
    
    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

async function insertPerformanceData() {
  try {
    // Check if performance data already exists
    const { data: existingPerformance } = await supabase
      .from('campaign_allocations_performance')
      .select('id')
      .limit(1);

    if (existingPerformance && existingPerformance.length > 0) {
      console.log('Performance data already exists');
      return;
    }

    // Get campaigns and vendors to create performance data
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, stream_goal, budget')
      .eq('source', APP_CAMPAIGN_SOURCE)
      .eq('campaign_type', APP_CAMPAIGN_TYPE);

    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('is_active', true);

    const { data: playlists } = await supabase
      .from('playlists')
      .select('id, vendor_id, avg_daily_streams');

    if (!campaigns?.length || !vendors?.length || !playlists?.length) {
      console.log('Missing data for performance generation');
      return;
    }

    // Generate performance data for each campaign
    const performanceData = [];
    
    for (const campaign of campaigns) {
      // Select 2-4 random playlists per campaign
      const shuffledPlaylists = playlists.sort(() => 0.5 - Math.random());
      const selectedPlaylists = shuffledPlaylists.slice(0, Math.floor(Math.random() * 3) + 2);
      
      for (const playlist of selectedPlaylists) {
        const vendor = vendors.find(v => v.id === playlist.vendor_id);
        if (!vendor) continue;

        // Generate realistic performance metrics
        const baseStreams = Math.floor(playlist.avg_daily_streams * 30); // Monthly estimate
        const variance = 0.8 + Math.random() * 0.4; // 80% - 120% variance
        const actualStreams = Math.floor(baseStreams * variance);
        const predictedStreams = baseStreams;
        
        const baseCostPerStream = 0.02 + Math.random() * 0.06; // $0.02 - $0.08
        const performanceScore = Math.min(1.0, Math.max(0.1, actualStreams / predictedStreams));

        performanceData.push({
          campaign_id: campaign.id,
          playlist_id: playlist.id,
          vendor_id: playlist.vendor_id,
          allocated_streams: Math.floor(campaign.stream_goal * 0.25), // 25% allocation
          predicted_streams: predictedStreams,
          actual_streams: actualStreams,
          cost_per_stream: baseCostPerStream,
          actual_cost_per_stream: baseCostPerStream * (1 + (Math.random() - 0.5) * 0.2),
          performance_score: performanceScore
        });
      }
    }

    if (performanceData.length > 0) {
      const { error: perfError } = await supabase
        .from('campaign_allocations_performance')
        .insert(performanceData);

      if (perfError) throw perfError;
      console.log('Performance data inserted successfully');
    }

    // Add some campaign submissions data
    const submissionData = campaigns.map(campaign => ({
      campaign_id: campaign.id,
      price_paid: campaign.budget * (1.2 + Math.random() * 0.3), // 120-150% of budget
      stream_goal: campaign.stream_goal,
      start_date: new Date().toISOString().split('T')[0],
      duration_days: 90,
      client_name: "Sample Client",
      client_emails: ["client@example.com"],
      campaign_name: `Campaign ${campaign.id.slice(0, 8)}`,
      track_url: "https://open.spotify.com/track/sample",
      salesperson: "sample@artistinfluence.com",
      status: "approved"
    }));

    const { error: submissionError } = await supabase
      .from('campaign_submissions')
      .insert(submissionData);

    if (submissionError) {
      console.log('Campaign submissions already exist or error:', submissionError);
    }

  } catch (error) {
    console.error('Error inserting performance data:', error);
  }
}







