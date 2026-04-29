import { redirect } from 'next/navigation'

export default function StorePage({ params }: { params: { id: string } }) {
  redirect(`/stores/${params.id}/overview`)
}
