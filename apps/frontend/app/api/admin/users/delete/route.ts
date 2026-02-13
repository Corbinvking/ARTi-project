import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId ?? body.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required (body: { userId } or { id })' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some((r: any) => r.role === 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Delete from public tables first (same order as [id] route)
    await supabaseAdmin.from('user_permissions').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    await supabaseAdmin.from('vendor_users').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.from('salespeople').update({ auth_user_id: null }).eq('auth_user_id', userId);
    await supabaseAdmin.from('users').delete().eq('id', userId);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'User deleted successfully', userId });
  } catch (error) {
    console.error('Unexpected error in delete user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

