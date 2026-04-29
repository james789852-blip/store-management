import { StoreSidebar } from '@/components/StoreSidebar'

export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <StoreSidebar storeId={params.id} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
