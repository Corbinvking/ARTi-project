import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route for Spotify Web API playlist endpoint
 * This avoids CORS issues when calling from localhost in development
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Handle both Next.js 14 (sync) and Next.js 15 (async) params
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    
    console.log('[Spotify Proxy] Fetching playlist:', id);
    
    if (!id || id.length !== 22) {
      console.log('[Spotify Proxy] Invalid ID length:', id?.length);
      return NextResponse.json(
        { success: false, error: `Invalid Spotify playlist ID. Got "${id}" (${id?.length || 0} chars), expected 22 characters.` },
        { status: 400 }
      );
    }
    
    // Use production API
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';
    const apiUrl = `${apiBaseUrl}/api/spotify-web-api/playlist/${id}`;
    console.log('[Spotify Proxy] Calling:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't cache - always get fresh data
      cache: 'no-store',
    });
    
    console.log('[Spotify Proxy] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Spotify Proxy] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, error: `Spotify API error: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('[Spotify Proxy] Success:', data?.data?.name || 'unknown');
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('[Spotify Proxy] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch from Spotify' },
      { status: 500 }
    );
  }
}

