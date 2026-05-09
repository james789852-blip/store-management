import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  // Verify caller is super_admin
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

  const { email, display_name, role } = await request.json()
  if (!email || !display_name || !role) {
    return NextResponse.json({ error: '資料不完整' }, { status: 400 })
  }

  // Invite user via Supabase Admin API (sends magic link / password setup email)
  const origin = new URL(request.url).origin
  const { data: invited, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { display_name, role },
    redirectTo: `${origin}/auth/confirm?next=/`,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Upsert profile (trigger will also create one, but we set role & display_name)
  await adminSupabase.from('user_profiles').upsert({
    id: invited.user.id,
    email,
    role,
    display_name,
  })

  return NextResponse.json({ ok: true })
}
