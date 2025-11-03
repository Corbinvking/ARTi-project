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
};

