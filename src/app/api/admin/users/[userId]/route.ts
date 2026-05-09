import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  await adminSupabase.from('user_profiles').delete().eq('id', userId)
  await adminSupabase.auth.admin.deleteUser(userId)

  return NextResponse.json({ ok: true })
}
