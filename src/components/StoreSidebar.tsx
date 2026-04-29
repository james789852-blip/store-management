'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  '建置中': 'bg-blue-100 text-blue-700',
  '試營運': 'bg-amber-100 text-amber-700',
  '營運中': 'bg-green-100 text-green-700',
  '暫停': 'bg-gray-100 text-gray-500',
  '歇業': 'bg-red-100 text-red-600',
}

const MODULES = [
  { id: 'overview', label: '總覽' },
  { id: 'budget', label: '預算規劃' },
  { id: 'shareholders', label: '股東收款' },
  { id: 'design', label: '設計資料' },
  { id: 'expenses', label: '費用記錄' },
  { id: 'schedule', label: '建置排程' },
  { id: 'log', label: '施工日誌' },
  { id: 'todos', label: '待辦事項' },
  { id: 'vendors', label: '廠商資料' },
  { id: 'equipment', label: '設備清單' },
  { id: 'permits', label: '政府申請' },
  { id: 'profit', label: '損益試算' },
  { id: 'checklist', label: '開幕確認' },
]

export function StoreSidebar({ storeId }: { storeId: string }) {
  const pathname = usePathname()
  const [store, setStore] = useState<Pick<Store, 'id' | 'name' | 'status'> | null>(null)

  useEffect(() => {
    supabase.from('stores').select('id, name, status').eq('id', storeId).single()
      .then(({ data }) => setStore(data))
  }, [storeId])

  return (
    <aside className="w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← 所有店面
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-1">目前店面</p>
        <h2 className="font-bold text-gray-900 text-sm truncate leading-snug">
          {store?.name || '載入中...'}
        </h2>
        {store?.status && (
          <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[store.status] || 'bg-gray-100 text-gray-500'}`}>
            {store.status}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {MODULES.map(mod => {
          const href = `/stores/${storeId}/${mod.id}`
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={mod.id}
              href={href}
              className={`block px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {mod.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-gray-100">
        <Link
          href="/sop"
          className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          SOP 知識庫
        </Link>
      </div>
    </aside>
  )
}
