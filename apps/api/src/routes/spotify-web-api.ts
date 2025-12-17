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
   */
  server.get('/spotify-web-api/track/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const trackData = await spotifyWebApi.getTrack(id);
      
      // Fetch artist details to get genres
      const artistIds = trackData.artists.map(a => a.id);
      const { artists } = await spotifyWebApi.getArtists(artistIds);
      
      // Aggregate genres from all artists
      const allGenres = artists.flatMap(a => a.genres || []);
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
}

