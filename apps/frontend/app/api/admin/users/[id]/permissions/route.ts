import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    const body = await request.json()
    
    console.log('🔄 Proxying permission update for user:', userId)
    
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Backend error updating permissions:', response.status, data)
      return NextResponse.json(
        { error: data.error || 'Failed to update permissions' },
        { status: response.status }
      )
    }

    console.log('✅ Successfully updated permissions for user:', userId)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Proxy error updating permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
