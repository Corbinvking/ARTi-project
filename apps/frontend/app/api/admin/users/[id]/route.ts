import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    console.log('🔄 Proxying DELETE request for user:', userId)
    
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Backend error deleting user:', response.status, data)
      return NextResponse.json(
        { error: data.error || 'Failed to delete user' },
        { status: response.status }
      )
    }

    console.log('✅ Successfully deleted user:', userId)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Proxy error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
