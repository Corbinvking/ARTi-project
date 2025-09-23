import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Proxying GET request to:', `${API_BASE_URL}/admin/users`)
    
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward any auth headers from the original request
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Backend error:', response.status, data)
      return NextResponse.json(
        { error: data.error || 'Failed to fetch users' },
        { status: response.status }
      )
    }

    console.log('✅ Successfully fetched users:', data.users?.length || 0)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔄 Proxying POST request to create user:', body.email)
    
    // Get Supabase JWT token from the frontend
    const authHeader = request.headers.get('Authorization')
    console.log('🔑 Auth header received:', authHeader ? 'Present' : 'Missing')
    
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Backend error creating user:', response.status, data)
      return NextResponse.json(
        { error: data.error || 'Failed to create user' },
        { status: response.status }
      )
    }

    console.log('✅ Successfully created user:', data.user?.email)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Proxy error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
