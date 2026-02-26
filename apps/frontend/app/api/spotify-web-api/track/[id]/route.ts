import { NextRequest, NextResponse } from 'next/server';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { name: string; release_date: string };
  duration_ms: number;
  popularity: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables');
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify authentication failed: ${response.status}`);
  }

  const data: SpotifyTokenResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

async function spotifyFetch<T>(endpoint: string): Promise<T> {
  const token = await getSpotifyToken();

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (response.status === 401) {
    cachedToken = null;
    const retryToken = await getSpotifyToken();
    const retry = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: { 'Authorization': `Bearer ${retryToken}` },
    });
    if (!retry.ok) throw new Error(`Spotify API error: ${retry.status}`);
    return retry.json() as Promise<T>;
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id || id.length !== 22) {
      return NextResponse.json(
        { success: false, error: `Invalid Spotify track ID. Got "${id}" (${id?.length || 0} chars), expected 22 characters.` },
        { status: 400 }
      );
    }

    const trackData = await spotifyFetch<SpotifyTrack>(`/tracks/${id}`);

    const artistIds = trackData.artists.map(a => a.id);
    const { artists } = await spotifyFetch<{ artists: SpotifyArtist[] }>(
      `/artists?ids=${artistIds.join(',')}`
    );

    let allGenres = artists.flatMap(a => a.genres || []);

    // Fallback: fetch genres from related artists if none found
    if (allGenres.length === 0 && artistIds[0]) {
      try {
        const related = await spotifyFetch<{ artists: SpotifyArtist[] }>(
          `/artists/${artistIds[0]}/related-artists`
        );
        const genreCounts = new Map<string, number>();
        related.artists.forEach(artist => {
          artist.genres?.forEach(genre => {
            genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
          });
        });
        allGenres = Array.from(genreCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([genre]) => genre);
      } catch {
        // Related artists lookup is best-effort
      }
    }

    const uniqueGenres = [...new Set(allGenres)];

    return NextResponse.json({
      success: true,
      data: {
        id: trackData.id,
        name: trackData.name,
        artists: trackData.artists.map(a => ({ id: a.id, name: a.name })),
        album: trackData.album.name,
        release_date: trackData.album.release_date,
        duration_ms: trackData.duration_ms,
        popularity: trackData.popularity,
        genres: uniqueGenres,
      },
    });
  } catch (error: any) {
    console.error('[Spotify Track API] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch track from Spotify' },
      { status: 500 }
    );
  }
}
