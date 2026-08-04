import { redirect } from 'next/navigation'

export default async function ProfitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/stores/${id}/overview`)
}
