import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route for Spotify Web API playlist endpoint
 * This avoids CORS issues when calling from localhost in development
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || id.length !== 22) {
      return NextResponse.json(
        { success: false, error: 'Invalid Spotify playlist ID. Must be 22 characters.' },
        { status: 400 }
      );
    }
    
    // Use production API
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';
    const response = await fetch(`${apiBaseUrl}/api/spotify-web-api/playlist/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Spotify API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, error: `Spotify API error: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Spotify proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch from Spotify' },
      { status: 500 }
    );
  }
}

