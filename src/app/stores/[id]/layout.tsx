import { StoreSidebar } from '@/components/StoreSidebar'

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <StoreSidebar storeId={id} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
