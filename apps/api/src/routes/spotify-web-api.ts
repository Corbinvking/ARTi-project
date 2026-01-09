import { FastifyInstance } from 'fastify';
import { spotifyWebApi, SpotifyWebAPIClient } from '@/lib/spotify-web-api';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Spotify Web API Routes
 * Endpoints for enriching database with Spotify metadata
 */
export async function spotifyWebApiRoutes(server: FastifyInstance) {
  
  /**
   * GET /spotify-web-api/playlist/:id
   * Fetch playlist details and follower count
   */
  server.get('/spotify-web-api/playlist/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const playlistData = await spotifyWebApi.getPlaylist(id);
      
      return {
        success: true,
        data: {
          id: playlistData.id,
          name: playlistData.name,
          description: playlistData.description,
          followers: playlistData.followers.total,
          track_count: playlistData.tracks.total,
          owner: playlistData.owner.display_name,
        },
      };
    } catch (error: any) {
      logger.error({ playlistId: id, error: error.message }, 'Failed to fetch playlist');
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /spotify-web-api/track/:id
   * Fetch track details including name, artist, and metadata
   * Includes fallback to related artists for genre detection
   */
  server.get('/spotify-web-api/track/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const trackData = await spotifyWebApi.getTrack(id);
      
      // Fetch artist details to get genres
      const artistIds = trackData.artists.map(a => a.id);
      const { artists } = await spotifyWebApi.getArtists(artistIds);
      
      // Aggregate genres from all artists
      let allGenres = artists.flatMap(a => a.genres || []);
      
      // If no genres found, try to get genres from related artists
      const primaryArtistId = artistIds[0];
      if (allGenres.length === 0 && primaryArtistId) {
        logger.info({ artistId: primaryArtistId }, 'No genres found, checking related artists...');
        try {
          const relatedGenres = await spotifyWebApi.getRelatedArtistGenres(primaryArtistId);
          if (relatedGenres.length > 0) {
            logger.info({ relatedGenres }, 'Found genres from related artists');
            allGenres = relatedGenres;
          }
        } catch (relatedError: any) {
          logger.warn({ error: relatedError.message }, 'Could not fetch related artists');
        }
      }
      
      const uniqueGenres = [...new Set(allGenres)];
      
      return {
        success: true,
        data: {
          id: trackData.id,
          name: trackData.name,
          artists: trackData.artists.map(a => ({
            id: a.id,
            name: a.name,
          })),
          album: trackData.album.name,
          release_date: trackData.album.release_date,
          duration_ms: trackData.duration_ms,
          popularity: trackData.popularity,
          genres: uniqueGenres,
        },
      };
    } catch (error: any) {
      logger.error({ trackId: id, error: error.message }, 'Failed to fetch track');
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /spotify-web-api/playlist/:id/genres
   * Fetch genres for a playlist by aggregating artist genres from tracks
   */
  server.get('/spotify-web-api/playlist/:id/genres', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      logger.info({ playlistId: id }, 'Fetching playlist genres');
      const genres = await spotifyWebApi.getPlaylistGenres(id);
      
      return {
        success: true,
        data: {
          playlist_id: id,
          genres: genres,
          genre_count: genres.length,
        },
      };
    } catch (error: any) {
      logger.error({ playlistId: id, error: error.message }, 'Failed to fetch playlist genres');
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /spotify-web-api/enrich-playlists
   * Bulk enrich playlists with follower counts
   */
  server.post('/spotify-web-api/enrich-playlists', async (request, reply) => {
    const { playlist_urls } = request.body as { playlist_urls: string[] };
    
    if (!playlist_urls || !Array.isArray(playlist_urls)) {
      return reply.status(400).send({
        success: false,
        error: 'playlist_urls must be an array',
      });
    }

    logger.info({ count: playlist_urls.length }, 'Starting playlist enrichment');
    
    const results = {
      success: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const url of playlist_urls) {
      try {
        const playlistId = SpotifyWebAPIClient.extractSpotifyId(url, 'playlist');
        if (!playlistId) {
          results.failed++;
          results.details.push({ url, error: 'Invalid playlist URL' });
          continue;
        }

        const playlistData = await spotifyWebApi.getPlaylist(playlistId);
        
        // Update database
        const { error: updateError } = await supabase
          .from('playlists')
          .update({
            follower_count: playlistData.followers.total,
            updated_at: new Date().toISOString(),
          })
          .eq('url', url);

        if (updateError) {
          logger.error({ url, error: updateError }, 'Failed to update playlist in database');
          results.failed++;
          results.details.push({ url, error: updateError.message });
        } else {
          results.success++;
          results.details.push({ 
            url, 
            name: playlistData.name,
            followers: playlistData.followers.total 
          });
        }

        // Rate limiting: 1 request per 100ms (safe for Spotify's limits)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        logger.error({ url, error: error.message }, 'Failed to process playlist');
        results.failed++;
        results.details.push({ url, error: error.message });
      }
    }

    logger.info(results, 'Playlist enrichment completed');
    
    return {
      status: 'completed',
      success_count: results.success,
      failed_count: results.failed,
      details: results.details,
    };
  });

  /**
   * POST /spotify-web-api/enrich-playlist-genres
   * Bulk enrich playlists with genre tags from their artists
   */
  server.post('/spotify-web-api/enrich-playlist-genres', async (request, reply) => {
    const { playlist_ids } = request.body as { playlist_ids: string[] };
    
    if (!playlist_ids || !Array.isArray(playlist_ids)) {
      return reply.status(400).send({
        success: false,
        error: 'playlist_ids must be an array of playlist IDs',
      });
    }

    logger.info({ count: playlist_ids.length }, 'Starting playlist genre enrichment');
    
    const results = {
      success: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const playlistId of playlist_ids) {
      try {
        // Fetch genres for this playlist
        const genres = await spotifyWebApi.getPlaylistGenres(playlistId);
        
        // Update database - find playlist by spotify_id
        const { error: updateError } = await supabase
          .from('playlists')
          .update({
            genres: genres, // PostgreSQL text[] array
            updated_at: new Date().toISOString(),
          })
          .eq('spotify_id', playlistId);

        if (updateError) {
          logger.error({ playlistId, error: updateError }, 'Failed to update playlist genres in database');
          results.failed++;
          results.details.push({ playlistId, error: updateError.message });
        } else {
          results.success++;
          results.details.push({ 
            playlistId, 
            genres,
            genreCount: genres.length
          });
        }

        // Rate limiting: 200ms between requests (safe for Spotify's limits)
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        logger.error({ playlistId, error: error.message }, 'Failed to process playlist genres');
        results.failed++;
        results.details.push({ playlistId, error: error.message });
      }
    }

    logger.info(results, 'Playlist genre enrichment completed');
    
    return {
      status: 'completed',
      success_count: results.success,
      failed_count: results.failed,
      details: results.details,
    };
  });

  /**
   * POST /spotify-web-api/enrich-playlists-full
   * Comprehensive enrichment: Spotify data (followers, name) + scraped data (avg_daily_streams)
   */
  server.post('/spotify-web-api/enrich-playlists-full', async (request, reply) => {
    const { playlist_ids } = request.body as { playlist_ids?: string[] };
    
    logger.info({ count: playlist_ids?.length || 'all' }, 'Starting full playlist enrichment');
    
    const results = {
      success: 0,
      failed: 0,
      spotify_enriched: 0,
      streams_calculated: 0,
      details: [] as any[],
    };

    try {
      // Step 1: Get playlists to enrich (either specific IDs or all with spotify_id)
      let playlistsQuery = supabase
        .from('playlists')
        .select('id, name, url, spotify_id, follower_count, avg_daily_streams');
      
      if (playlist_ids && playlist_ids.length > 0) {
        playlistsQuery = playlistsQuery.in('id', playlist_ids);
      }
      
      const { data: playlists, error: fetchError } = await playlistsQuery;
      
      if (fetchError) {
        logger.error({ error: fetchError }, 'Failed to fetch playlists');
        return reply.status(500).send({ success: false, error: fetchError.message });
      }
      
      logger.info({ count: playlists?.length }, 'Fetched playlists to enrich');

      // Step 2: Calculate avg_daily_streams from campaign_playlists data
      const { data: streamData, error: streamError } = await supabase
        .from('campaign_playlists')
        .select('playlist_name, streams_7d, streams_24h');
      
      if (streamError) {
        logger.warn({ error: streamError }, 'Failed to fetch campaign_playlists for stream data');
      }
      
      // Group streams by playlist name and calculate averages
      const streamsByName = new Map<string, { total7d: number; total24h: number; count: number }>();
      for (const row of streamData || []) {
        const name = row.playlist_name?.toLowerCase()?.trim();
        if (!name) continue;
        
        if (!streamsByName.has(name)) {
          streamsByName.set(name, { total7d: 0, total24h: 0, count: 0 });
        }
        const entry = streamsByName.get(name)!;
        entry.total7d += row.streams_7d || 0;
        entry.total24h += row.streams_24h || 0;
        entry.count++;
      }

      // Step 3: Process each playlist
      for (const playlist of playlists || []) {
        try {
          const updates: any = { updated_at: new Date().toISOString() };
          let enriched = false;

          // Try to get Spotify data if we have a spotify_id or can extract from URL
          let spotifyId = playlist.spotify_id;
          if (!spotifyId && playlist.url) {
            spotifyId = SpotifyWebAPIClient.extractSpotifyId(playlist.url, 'playlist');
          }

          if (spotifyId) {
            try {
              const spotifyData = await spotifyWebApi.getPlaylist(spotifyId);
              if (spotifyData) {
                updates.follower_count = spotifyData.followers?.total || 0;
                updates.spotify_id = spotifyId; // Ensure spotify_id is set
                results.spotify_enriched++;
                enriched = true;
                
                logger.info({ 
                  name: playlist.name, 
                  followers: updates.follower_count 
                }, 'Fetched Spotify data');
              }
            } catch (spotifyError: any) {
              logger.warn({ playlistId: spotifyId, error: spotifyError.message }, 'Spotify API error');
            }
            
            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Calculate avg_daily_streams from scraped data
          const normalizedName = playlist.name?.toLowerCase()?.trim();
          const streamEntry = streamsByName.get(normalizedName);
          if (streamEntry && streamEntry.count > 0) {
            // Prefer 7-day average, fallback to 24h
            const avgDaily = streamEntry.total7d > 0 
              ? Math.round(streamEntry.total7d / 7)
              : streamEntry.total24h;
            
            if (avgDaily > 0) {
              updates.avg_daily_streams = avgDaily;
              results.streams_calculated++;
              enriched = true;
            }
          }

          // Update playlist if we have new data
          if (enriched) {
            const { error: updateError } = await supabase
              .from('playlists')
              .update(updates)
              .eq('id', playlist.id);

            if (updateError) {
              logger.error({ id: playlist.id, error: updateError }, 'Failed to update playlist');
              results.failed++;
              results.details.push({ id: playlist.id, name: playlist.name, error: updateError.message });
            } else {
              results.success++;
              results.details.push({ 
                id: playlist.id, 
                name: playlist.name,
                followers: updates.follower_count,
                avg_daily_streams: updates.avg_daily_streams
              });
            }
          } else {
            results.details.push({ 
              id: playlist.id, 
              name: playlist.name, 
              skipped: true,
              reason: 'No spotify_id and no stream data'
            });
          }
          
        } catch (error: any) {
          logger.error({ id: playlist.id, error: error.message }, 'Failed to process playlist');
          results.failed++;
          results.details.push({ id: playlist.id, name: playlist.name, error: error.message });
        }
      }

      logger.info(results, 'Full playlist enrichment completed');
      
      return {
        status: 'completed',
        success_count: results.success,
        failed_count: results.failed,
        spotify_enriched: results.spotify_enriched,
        streams_calculated: results.streams_calculated,
        total_processed: playlists?.length || 0,
        details: results.details.slice(0, 50), // Limit response size
      };
      
    } catch (error: any) {
      logger.error({ error: error.message }, 'Full enrichment failed');
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  /**
   * POST /spotify-web-api/enrich-tracks
   * Bulk enrich tracks with metadata (name, artist, genres)
   */
  server.post('/spotify-web-api/enrich-tracks', async (request, reply) => {
    const { track_urls } = request.body as { track_urls: string[] };
    
    if (!track_urls || !Array.isArray(track_urls)) {
      return reply.status(400).send({
        success: false,
        error: 'track_urls must be an array',
      });
    }

    logger.info({ count: track_urls.length }, 'Starting track enrichment');
    
    const results = {
      success: 0,
      failed: 0,
      details: [] as any[],
    };

    // Extract track IDs
    const trackIds: string[] = [];
    const urlToIdMap = new Map<string, string>();
    
    for (const url of track_urls) {
      const trackId = SpotifyWebAPIClient.extractSpotifyId(url, 'track');
      if (trackId) {
        trackIds.push(trackId);
        urlToIdMap.set(trackId, url);
      } else {
        results.failed++;
        results.details.push({ url, error: 'Invalid track URL' });
      }
    }

    // Fetch tracks in batches
    const { tracks } = await spotifyWebApi.getTracks(trackIds);
    
    // Collect all unique artist IDs
    const artistIds = [...new Set(tracks.flatMap(t => t.artists.map(a => a.id)))];
    
    // Fetch all artist details (for genres)
    const { artists } = await spotifyWebApi.getArtists(artistIds);
    const artistMap = new Map(artists.map(a => [a.id, a]));

    // Process each track
    for (const track of tracks) {
      try {
        const url = urlToIdMap.get(track.id);
        if (!url) continue;

        // Aggregate genres from all artists on the track
        const trackGenres = track.artists
          .flatMap(a => artistMap.get(a.id)?.genres || []);
        const uniqueGenres = [...new Set(trackGenres)];

        // Update spotify_campaigns table
        const { error: updateError } = await supabase
          .from('spotify_campaigns')
          .update({
            artist_name: track.artists.map(a => a.name).join(', '),
            // Store genres in notes or create a new column
            updated_at: new Date().toISOString(),
          })
          .eq('url', url);

        if (updateError) {
          logger.error({ url, error: updateError }, 'Failed to update track in database');
          results.failed++;
          results.details.push({ url, error: updateError.message });
        } else {
          results.success++;
          results.details.push({ 
            url,
            name: track.name,
            artists: track.artists.map(a => a.name),
            genres: uniqueGenres,
          });
        }
        
      } catch (error: any) {
        logger.error({ trackId: track.id, error: error.message }, 'Failed to process track');
        results.failed++;
        results.details.push({ url: urlToIdMap.get(track.id), error: error.message });
      }
    }

    logger.info(results, 'Track enrichment completed');
    
    return {
      status: 'completed',
      success_count: results.success,
      failed_count: results.failed,
      details: results.details,
    };
  });

  /**
   * GET /spotify-web-api/extract-id
   * Utility endpoint to extract Spotify ID from URL
   */
  server.get('/spotify-web-api/extract-id', async (request, reply) => {
    const { url, type } = request.query as { url: string; type: 'track' | 'playlist' | 'artist' };
    
    if (!url || !type) {
      return reply.status(400).send({
        success: false,
        error: 'url and type parameters are required',
      });
    }

    const id = SpotifyWebAPIClient.extractSpotifyId(url, type);
    
    if (!id) {
      return reply.status(400).send({
        success: false,
        error: 'Could not extract Spotify ID from URL',
      });
    }

    return {
      success: true,
      id,
      type,
    };
  });

  /**
   * GET /spotify-web-api/search-playlist
   * Search for playlists by name
   * Returns top matches with spotify_id and URL
   */
  server.get('/spotify-web-api/search-playlist', async (request, reply) => {
    const { name, limit } = request.query as { name: string; limit?: string };
    
    if (!name) {
      return reply.status(400).send({
        success: false,
        error: 'name parameter is required',
      });
    }

    try {
      const searchLimit = limit ? parseInt(limit, 10) : 10;
      const results = await spotifyWebApi.searchPlaylist(name, searchLimit);
      
      return {
        success: true,
        query: name,
        count: results.length,
        results,
      };
    } catch (error: any) {
      logger.error({ name, error: error.message }, 'Playlist search failed');
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /spotify-web-api/find-playlist
   * Find a playlist by exact name match (case-insensitive)
   * Returns the best matching playlist with spotify_id and URL
   */
  server.get('/spotify-web-api/find-playlist', async (request, reply) => {
    const { name } = request.query as { name: string };
    
    if (!name) {
      return reply.status(400).send({
        success: false,
        error: 'name parameter is required',
      });
    }

    try {
      const result = await spotifyWebApi.findPlaylistByName(name);
      
      if (!result) {
        return {
          success: true,
          found: false,
          query: name,
          playlist: null,
        };
      }
      
      return {
        success: true,
        found: true,
        query: name,
        playlist: result,
      };
    } catch (error: any) {
      logger.error({ name, error: error.message }, 'Playlist find failed');
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /spotify-web-api/bulk-find-playlists
   * Find multiple playlists by name with rate limiting
   * Used for vendor playlist import to get spotify_id and URLs
   */
  server.post('/spotify-web-api/bulk-find-playlists', async (request, reply) => {
    const { names } = request.body as { names: string[] };
    
    if (!names || !Array.isArray(names)) {
      return reply.status(400).send({
        success: false,
        error: 'names array is required',
      });
    }

    logger.info({ count: names.length }, 'Bulk playlist find request');

    const results: Array<{
      name: string;
      found: boolean;
      spotify_id: string | null;
      spotify_url: string | null;
      matched_name: string | null;
      owner: string | null;
      followers: number | null;
    }> = [];

    // Process one at a time with 100ms delay to respect rate limits
    for (let i = 0; i < names.length; i++) {
      const name = names[i] as string;
      if (!name) continue;
      
      try {
        const result = await spotifyWebApi.findPlaylistByName(name);
        
        if (result) {
          results.push({
            name: name,
            found: true,
            spotify_id: result.id,
            spotify_url: result.url,
            matched_name: result.name,
            owner: result.owner,
            followers: result.followers,
          });
        } else {
          results.push({
            name: name,
            found: false,
            spotify_id: null,
            spotify_url: null,
            matched_name: null,
            owner: null,
            followers: null,
          });
        }
      } catch (error: any) {
        logger.warn({ name, error: error.message }, 'Failed to find playlist');
        results.push({
          name: name,
          found: false,
          spotify_id: null,
          spotify_url: null,
          matched_name: null,
          owner: null,
          followers: null,
        });
      }
      
      // Rate limiting: 100ms between requests
      if (i < names.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const foundCount = results.filter(r => r.found).length;
    logger.info({ total: names.length, found: foundCount }, 'Bulk playlist find complete');

    return {
      success: true,
      results,
      summary: {
        total: names.length,
        found: foundCount,
        not_found: names.length - foundCount,
      },
    };
  });

  /**
   * POST /spotify-web-api/bulk-playlist-info
   * Fetch playlist info (name, followers, owner) for multiple playlist URLs
   * Used during campaign import to resolve playlist names from URLs
   */
  server.post('/spotify-web-api/bulk-playlist-info', async (request, reply) => {
    const { urls } = request.body as { urls: string[] };
    
    if (!urls || !Array.isArray(urls)) {
      return reply.status(400).send({
        success: false,
        error: 'urls array is required',
      });
    }

    logger.info({ count: urls.length }, 'Bulk playlist info request');

    const results: Array<{
      url: string;
      spotify_id: string | null;
      name: string | null;
      followers: number | null;
      owner: string | null;
      error?: string;
    }> = [];

    // Process in parallel with rate limiting (5 at a time)
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          try {
            // Extract playlist ID from URL
            const playlistId = SpotifyWebAPIClient.extractSpotifyId(url, 'playlist');
            
            if (!playlistId) {
              return {
                url,
                spotify_id: null,
                name: null,
                followers: null,
                owner: null,
                error: 'Could not extract playlist ID from URL',
              };
            }

            // Fetch playlist info
            const playlistData = await spotifyWebApi.getPlaylist(playlistId);
            
            return {
              url,
              spotify_id: playlistId,
              name: playlistData.name,
              followers: playlistData.followers.total,
              owner: playlistData.owner.display_name,
            };
          } catch (error: any) {
            logger.warn({ url, error: error.message }, 'Failed to fetch playlist info');
            // Try to extract ID even if fetch failed
            const playlistId = SpotifyWebAPIClient.extractSpotifyId(url, 'playlist');
            return {
              url,
              spotify_id: playlistId,
              name: null,
              followers: null,
              owner: null,
              error: error.message,
            };
          }
        })
      );
      
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const successCount = results.filter(r => r.name !== null).length;
    logger.info({ total: urls.length, success: successCount }, 'Bulk playlist info complete');

    return {
      success: true,
      results,
      summary: {
        total: urls.length,
        resolved: successCount,
        failed: urls.length - successCount,
      },
    };
  });
}

