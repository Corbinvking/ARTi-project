import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    const permissions = await request.json()
    
    console.log('🔄 Updating permissions for user:', userId, permissions)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions array is required' },
        { status: 400 }
      )
    }

    // Import createClient here to avoid module issues
    const { createClient } = await import('@supabase/supabase-js')
    
    // Service role client for admin operations
    const supabaseAdmin = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    )

    // Delete existing permissions for this user
    const { error: deleteError } = await supabaseAdmin
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('❌ Delete error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete existing permissions: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Deleted existing permissions for user:', userId)

    // Insert new permissions
    if (permissions.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('user_permissions')
        .insert(
          permissions.map((perm: any) => ({
            user_id: userId,
            platform: perm.platform,
            can_read: perm.can_read,
            can_write: perm.can_write,
            can_delete: perm.can_delete
          }))
        )

      if (insertError) {
        console.error('❌ Insert error:', insertError)
        return NextResponse.json(
          { error: `Failed to insert new permissions: ${insertError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ Inserted new permissions for user:', userId)
    }

    return NextResponse.json({
      message: 'Permissions updated successfully',
      permissions_count: permissions.length
    })
    
  } catch (error) {
    console.error('❌ Error updating permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}