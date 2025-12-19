import { NextRequest, NextResponse } from 'next/server';

// Get the backend API URL
function getApiUrl() {
  // Server-side: check env vars, with production fallback
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || process.env.API_BASE_URL;
  if (envUrl) return envUrl;
  
  // Production fallback
  return 'https://api.artistinfluence.com';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward request to backend API
    const apiUrl = getApiUrl();
    console.log('[AI Analytics] Forwarding to:', apiUrl);
    
    const response = await fetch(`${apiUrl}/api/ai-analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Analytics backend error:', response.status, errorText);
      return NextResponse.json(
        { 
          answer: 'Sorry, I encountered an error processing your request. Please try again.',
          error: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('AI Analytics proxy error:', error);
    return NextResponse.json(
      { 
        answer: 'Sorry, I could not connect to the analytics service. Please try again later.',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/ai-analytics/health`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}

