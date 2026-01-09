import { logger } from './logger';

/**
 * Spotify Web API Client
 * Handles authentication and API requests to Spotify's Web API
 */

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyPlaylistResponse {
  id: string;
  name: string;
  description: string;
  followers: {
    total: number;
  };
  tracks: {
    total: number;
  };
  owner: {
    display_name: string;
  };
}

interface SpotifyTrackResponse {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    name: string;
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
}

interface SpotifyArtistResponse {
  id: string;
  name: string;
  genres: string[];
  followers: {
    total: number;
  };
  popularity: number;
}

// Search API response types
interface SpotifySearchPlaylistItem {
  id: string;
  name: string;
  description: string;
  owner: {
    id: string;
    display_name: string;
  };
  followers?: {
    total: number;
  };
  tracks: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
}

interface SpotifySearchResponse {
  playlists: {
    items: SpotifySearchPlaylistItem[];
    total: number;
  };
}

interface SpotifyPlaylistSearchResult {
  id: string;
  name: string;
  owner: string;
  followers: number;
  trackCount: number;
  url: string;
}

class SpotifyWebAPIClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl = 'https://api.spotify.com/v1';

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get or refresh access token using Client Credentials Flow
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    logger.info('🔑 Requesting new Spotify access token...');

    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Failed to get Spotify access token');
      throw new Error(`Spotify authentication failed: ${response.status}`);
    }

    const data = await response.json() as SpotifyTokenResponse;
    this.accessToken = data.access_token;
    // Set expiry with 5 minute buffer
    this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);

    logger.info('✅ Spotify access token obtained successfully');
    return this.accessToken;
  }

  /**
   * Make authenticated request to Spotify API
   */
  private async makeRequest<T>(endpoint: string, retries = 1): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      logger.warn({ retryAfter, endpoint }, 'Rate limited by Spotify, waiting...');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return this.makeRequest<T>(endpoint, retries);
    }

    // Handle token expiry
    if (response.status === 401 && retries > 0) {
      logger.warn('Spotify token expired, refreshing...');
      this.accessToken = null;
      return this.makeRequest<T>(endpoint, retries - 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, endpoint, error: errorText }, 'Spotify API request failed');
      throw new Error(`Spotify API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get playlist details including follower count
   */
  async getPlaylist(playlistId: string): Promise<SpotifyPlaylistResponse> {
    logger.info({ playlistId }, 'Fetching playlist details from Spotify');
    return this.makeRequest<SpotifyPlaylistResponse>(`/playlists/${playlistId}`);
  }

  /**
   * Get track details including name, artist, album
   */
  async getTrack(trackId: string): Promise<SpotifyTrackResponse> {
    logger.info({ trackId }, 'Fetching track details from Spotify');
    return this.makeRequest<SpotifyTrackResponse>(`/tracks/${trackId}`);
  }

  /**
   * Get multiple tracks at once (more efficient)
   */
  async getTracks(trackIds: string[]): Promise<{ tracks: SpotifyTrackResponse[] }> {
    if (trackIds.length === 0) return { tracks: [] };
    
    // Spotify API allows up to 50 tracks per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 50) {
      chunks.push(trackIds.slice(i, i + 50));
    }

    const allTracks: SpotifyTrackResponse[] = [];
    for (const chunk of chunks) {
      const ids = chunk.join(',');
      const result = await this.makeRequest<{ tracks: SpotifyTrackResponse[] }>(`/tracks?ids=${ids}`);
      allTracks.push(...result.tracks);
    }

    return { tracks: allTracks };
  }

  /**
   * Get artist details including genres
   */
  async getArtist(artistId: string): Promise<SpotifyArtistResponse> {
    logger.info({ artistId }, 'Fetching artist details from Spotify');
    return this.makeRequest<SpotifyArtistResponse>(`/artists/${artistId}`);
  }

  /**
   * Get multiple artists at once (more efficient)
   */
  async getArtists(artistIds: string[]): Promise<{ artists: SpotifyArtistResponse[] }> {
    if (artistIds.length === 0) return { artists: [] };
    
    // Spotify API allows up to 50 artists per request
    const chunks = [];
    for (let i = 0; i < artistIds.length; i += 50) {
      chunks.push(artistIds.slice(i, i + 50));
    }

    const allArtists: SpotifyArtistResponse[] = [];
    for (const chunk of chunks) {
      const ids = chunk.join(',');
      const result = await this.makeRequest<{ artists: SpotifyArtistResponse[] }>(`/artists?ids=${ids}`);
      allArtists.push(...result.artists);
    }

    return { artists: allArtists };
  }

  /**
   * Get genres from related artists (fallback when artist has no genres)
   * Returns top 5 most common genres from related artists
   */
  async getRelatedArtistGenres(artistId: string): Promise<string[]> {
    logger.info({ artistId }, 'Fetching genres from related artists');
    
    try {
      const response = await this.makeRequest<{ artists: SpotifyArtistResponse[] }>(
        `/artists/${artistId}/related-artists`
      );
      
      logger.info({ artistId, relatedArtistsCount: response.artists?.length || 0 }, 'Got related artists response');
      
      // Log first few related artists for debugging
      if (response.artists && response.artists.length > 0) {
        const sampleArtists = response.artists.slice(0, 3).map(a => ({
          name: a.name,
          genres: a.genres
        }));
        logger.info({ artistId, sampleArtists }, 'Sample related artists with genres');
      }
      
      // Aggregate genres from related artists
      const genreCounts = new Map<string, number>();
      response.artists.forEach(artist => {
        if (artist?.genres) {
          artist.genres.forEach(genre => {
            genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
          });
        }
      });
      
      // Sort by frequency and return top 5
      const topGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre]) => genre);
      
      logger.info({ artistId, genreCount: topGenres.length, genres: topGenres }, 'Extracted genres from related artists');
      return topGenres;
    } catch (error: any) {
      logger.error({ artistId, error: error.message, stack: error.stack }, 'Failed to fetch related artists');
      return [];
    }
  }

  /**
   * Get playlist genres by analyzing tracks and their artists
   * Returns top 5 most common genres from the playlist's artists
   */
  async getPlaylistGenres(playlistId: string): Promise<string[]> {
    logger.info({ playlistId }, 'Fetching playlist genres from artists');
    
    // Fetch playlist tracks (limit to first 50 for performance)
    const tracksResponse = await this.makeRequest<{
      items: Array<{ track: SpotifyTrackResponse }>;
    }>(`/playlists/${playlistId}/tracks?limit=50`);
    
    // Extract unique artist IDs
    const artistIds = [
      ...new Set(
        tracksResponse.items
          .flatMap(item => item.track?.artists?.map(artist => artist.id) || [])
          .filter(Boolean)
      )
    ];
    
    if (artistIds.length === 0) {
      logger.warn({ playlistId }, 'No artists found in playlist');
      return [];
    }
    
    // Fetch artist details to get genres
    const { artists } = await this.getArtists(artistIds);
    
    // Aggregate genres and count occurrences
    const genreCounts = new Map<string, number>();
    artists.forEach(artist => {
      if (artist?.genres) {
        artist.genres.forEach(genre => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
      }
    });
    
    // Sort by frequency and return top 5
    const topGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
    
    logger.info({ playlistId, genreCount: topGenres.length }, 'Extracted playlist genres');
    return topGenres;
  }

  /**
   * Search for playlists by name
   * Returns top matches sorted by relevance
   */
  async searchPlaylist(query: string, limit = 10): Promise<SpotifyPlaylistSearchResult[]> {
    logger.info({ query, limit }, 'Searching for playlists on Spotify');
    
    try {
      const encoded = encodeURIComponent(query);
      const response = await this.makeRequest<SpotifySearchResponse>(
        `/search?q=${encoded}&type=playlist&limit=${limit}`
      );
      
      const results = response.playlists.items
        .filter(p => p !== null) // Filter out null items
        .map(p => ({
          id: p.id,
          name: p.name,
          owner: p.owner?.display_name || 'Unknown',
          followers: p.followers?.total || 0,
          trackCount: p.tracks?.total || 0,
          url: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`
        }));
      
      logger.info({ query, resultCount: results.length }, 'Playlist search complete');
      return results;
    } catch (error: any) {
      logger.error({ query, error: error.message }, 'Playlist search failed');
      return [];
    }
  }

  /**
   * Search for a playlist by exact name match (case-insensitive)
   * Falls back to best match if no exact match found
   */
  async findPlaylistByName(playlistName: string): Promise<SpotifyPlaylistSearchResult | null> {
    const results = await this.searchPlaylist(playlistName, 20);
    
    if (results.length === 0) {
      return null;
    }
    
    // Normalize the search name for comparison
    const normalizedSearch = playlistName.toLowerCase().trim();
    
    // Try to find exact match first
    const exactMatch = results.find(
      r => r.name.toLowerCase().trim() === normalizedSearch
    );
    
    if (exactMatch) {
      logger.info({ playlistName, matchedId: exactMatch.id }, 'Found exact playlist match');
      return exactMatch;
    }
    
    // If no exact match, check for close matches (contains the full search term)
    const closeMatch = results.find(
      r => r.name.toLowerCase().includes(normalizedSearch) ||
           normalizedSearch.includes(r.name.toLowerCase())
    );
    
    if (closeMatch) {
      logger.info({ playlistName, matchedId: closeMatch.id, matchedName: closeMatch.name }, 'Found close playlist match');
      return closeMatch;
    }
    
    // Return first result as fallback (best relevance from Spotify)
    const fallback = results[0];
    if (fallback) {
      logger.info({ playlistName, fallbackId: fallback.id, fallbackName: fallback.name }, 'Using fallback playlist match');
      return fallback;
    }
    
    return null;
  }

  /**
   * Extract Spotify ID from URL
   */
  static extractSpotifyId(url: string, type: 'track' | 'playlist' | 'artist'): string | null {
    try {
      // Handle open.spotify.com URLs
      const openMatch = url.match(new RegExp(`open\\.spotify\\.com/${type}/([a-zA-Z0-9]+)`));
      if (openMatch) return openMatch[1] || null;

      // Handle spotify: URIs
      const uriMatch = url.match(new RegExp(`spotify:${type}:([a-zA-Z0-9]+)`));
      if (uriMatch) return uriMatch[1] || null;

      // Assume it's already an ID if no URL pattern matches
      if (/^[a-zA-Z0-9]+$/.test(url)) return url;

      return null;
    } catch (error) {
      logger.error({ url, type, error }, 'Failed to extract Spotify ID');
      return null;
    }
  }
}

// Initialize singleton instance
const spotifyWebApi = new SpotifyWebAPIClient(
  process.env.SPOTIFY_CLIENT_ID || '',
  process.env.SPOTIFY_CLIENT_SECRET || ''
);

export { spotifyWebApi, SpotifyWebAPIClient };
export type {
  SpotifyPlaylistResponse,
  SpotifyTrackResponse,
  SpotifyArtistResponse,
  SpotifyPlaylistSearchResult,
};

