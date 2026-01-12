import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';

interface PlaylistData {
  rank?: string;
  name: string;
  made_by?: string;
  streams: string;
  date_added?: string;
}

interface TimeRangeStats {
  title?: string;
  streams?: number;
  listeners?: number;
  playlists?: PlaylistData[];
  playlist_stats?: {
    showing?: string;
    total?: string;
  };
}

interface TimeRangeData {
  stats: TimeRangeStats;
  insights?: any;
}

interface ScrapedData {
  url: string;
  scraped_at: string;
  time_ranges: {
    [key: string]: TimeRangeData;
  };
}

interface IngestRequest {
  campaign_id: number;
  scraped_data: ScrapedData;
  scraper_version?: string;
  timestamp?: string;
}

export async function s4aIngestRoutes(server: FastifyInstance) {
  /**
   * POST /api/ingest/s4a
   * Ingest Spotify for Artists scraped data
   */
  server.post('/ingest/s4a', async (request, reply) => {
    try {
      const { campaign_id, scraped_data, scraper_version } = request.body as IngestRequest;

      // Validate input
      if (!campaign_id || !scraped_data) {
        return reply.status(400).send({
          error: 'Missing required fields',
          required: ['campaign_id', 'scraped_data']
        });
      }

      if (!scraped_data.time_ranges) {
        return reply.status(400).send({
          error: 'Invalid scraped_data format',
          message: 'scraped_data.time_ranges is required'
        });
      }

    console.log(`📥 Ingesting S4A data for campaign ${campaign_id}`);

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let updatedPlaylists = 0;
    let createdPlaylists = 0;

    // Process each time range
    for (const [timeRange, data] of Object.entries(scraped_data.time_ranges)) {
      const stats = data.stats;

      // Update campaign stats (use 12months as primary)
      if (timeRange === '12months') {
        const { error: campaignError } = await supabase
          .from('spotify_campaigns')
          .update({
            plays_last_7d: stats.streams || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign_id);

        if (campaignError) {
          console.error(`Error updating campaign ${campaign_id}:`, campaignError);
        } else {
          console.log(`  ✅ Updated campaign ${campaign_id} with ${stats.streams} streams`);
        }
      }

      // Update playlist data
      const playlists = stats.playlists || [];
      console.log(`  📊 Processing ${playlists.length} playlists for ${timeRange}`);

      for (const playlist of playlists) {
        try {
          // Parse streams (remove commas)
          const streamsNum = parseInt(playlist.streams.replace(/,/g, '')) || 0;

          // Check if playlist entry exists
          const { data: existing, error: lookupError } = await supabase
            .from('campaign_playlists')
            .select('id')
            .eq('campaign_id', campaign_id)
            .ilike('playlist_name', playlist.name)
            .single();

          if (lookupError && lookupError.code !== 'PGRST116') {
            // PGRST116 = no rows found, which is fine
            console.error(`Error looking up playlist "${playlist.name}":`, lookupError);
            continue;
          }

          const playlistData = {
            campaign_id,
            playlist_name: playlist.name,
            playlist_curator: playlist.made_by || null,
            streams_12m: timeRange === '12months' ? streamsNum : undefined,
            streams_7d: timeRange === '7day' ? streamsNum : undefined,
            date_added: playlist.date_added || null,
            last_scraped: new Date().toISOString()
          };

          // Remove undefined values
          Object.keys(playlistData).forEach(key => 
            playlistData[key as keyof typeof playlistData] === undefined && 
            delete playlistData[key as keyof typeof playlistData]
          );

          if (existing) {
            // Update existing
            const { error: updateError } = await supabase
              .from('campaign_playlists')
              .update(playlistData)
              .eq('id', existing.id);

            if (updateError) {
              console.error(`Error updating playlist "${playlist.name}":`, updateError);
            } else {
              updatedPlaylists++;
            }
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('campaign_playlists')
              .insert(playlistData);

            if (insertError) {
              console.error(`Error inserting playlist "${playlist.name}":`, insertError);
            } else {
              createdPlaylists++;
            }
          }
        } catch (error) {
          console.error(`Error processing playlist "${playlist.name}":`, error);
        }
      }
    }

      console.log(`✅ Ingested S4A data for campaign ${campaign_id}`);
      console.log(`   Updated: ${updatedPlaylists} playlists`);
      console.log(`   Created: ${createdPlaylists} playlists`);

      return reply.send({
        success: true,
        campaign_id,
        stats: {
          playlists_updated: updatedPlaylists,
          playlists_created: createdPlaylists
        },
        scraper_version,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error ingesting S4A data:', error);
      return reply.status(500).send({
        error: 'Failed to ingest data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/campaigns/lookup-by-song/:songId
   * Lookup campaign ID by Spotify song ID
   */
  server.get('/campaigns/lookup-by-song/:songId', async (request, reply) => {
    try {
      const { songId } = request.params as { songId: string };

      if (!songId) {
        return reply.status(400).send({ error: 'songId is required' });
      }

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Look for campaign with matching Spotify URL
      // URL format in DB: https://open.spotify.com/track/{songId}
      const { data, error } = await supabase
        .from('spotify_campaigns')
        .select('id, campaign, url')
        .or(`url.ilike.%${songId}%,sfa.ilike.%${songId}%`)
        .limit(1)
        .single();

      if (error || !data) {
        return reply.status(404).send({
          error: 'Campaign not found',
          songId
        });
      }

      return reply.send({
        campaign_id: data.id,
        campaign_name: data.campaign,
        url: data.url
      });

    } catch (error) {
      console.error('Error looking up campaign:', error);
      return reply.status(500).send({
        error: 'Lookup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/campaigns/song-mapping
   * Get all song ID to campaign ID mappings
   * Used for caching in sync script
   */
  server.get('/campaigns/song-mapping', async (_request, reply) => {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get all campaigns with URLs
      const { data, error } = await supabase
        .from('spotify_campaigns')
        .select('id, url, sfa')
        .not('url', 'is', null);

      if (error) {
        throw error;
      }

      // Build mapping
      const mapping: { [key: string]: number } = {};

      data?.forEach((campaign) => {
        // Extract song ID from url (Spotify Web)
        const urlMatch = campaign.url?.match(/track\/([a-zA-Z0-9]+)/);
        if (urlMatch) {
          mapping[urlMatch[1]] = campaign.id;
        }

        // Extract song ID from sfa (Spotify for Artists)
        const sfaMatch = campaign.sfa?.match(/song\/([a-zA-Z0-9]+)/);
        if (sfaMatch) {
          mapping[sfaMatch[1]] = campaign.id;
        }
      });

      return reply.send(mapping);

    } catch (error) {
      console.error('Error building song mapping:', error);
      return reply.status(500).send({
        error: 'Failed to build mapping',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

