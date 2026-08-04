import { StoreLayoutClient } from '@/components/StoreLayoutClient'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, title')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin' && profile?.title !== '老闆') {
    const { data: member } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('store_id', id)
      .eq('user_id', user.id)
      .single()
    if (!member) redirect('/')
  }

  return (
    <StoreLayoutClient storeId={id}>
      {children}
    </StoreLayoutClient>
  )
}
