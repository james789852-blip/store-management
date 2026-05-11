'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { STORE_STATUS_LABEL } from '@/types'
import type { StoreStatus } from '@/types'

const NAV_GROUPS = [
  {
    label: '管理',
    items: [
      { id: 'overview',   label: '總覽' },
      { id: 'budget',     label: '預算規劃' },
      { id: 'investors',  label: '股東收款' },
      { id: 'basic',      label: '基本資料' },
      { id: 'expenses',   label: '費用記錄' },
      { id: 'design',     label: '設計資料' },
      { id: 'documents',  label: '文件管理' },
    ],
  },
  {
    label: '建置',
    items: [
      { id: 'schedule',   label: '建置排程' },
      { id: 'log',        label: '施工日誌' },
      { id: 'todos',      label: '待辦事項' },
      { id: 'vendors',    label: '廠商資料' },
    ],
  },
  {
    label: '開幕',
    items: [
      { id: 'equipment',  label: '設備清單' },
      { id: 'gov',        label: '政府申請' },
      { id: 'opening',    label: '開幕確認' },
    ],
  },
]

const STATUS_BADGE: Record<StoreStatus, string> = {
  building: 'bg-blue-100 text-blue-600',
  open:     'bg-emerald-100 text-emerald-600',
  paused:   'bg-amber-100 text-amber-600',
  closed:   'bg-gray-100 text-gray-400',
}

const AVATAR_GRAD: Record<StoreStatus, string> = {
  building: 'from-blue-500 to-indigo-600',
  open:     'from-emerald-400 to-teal-500',
  paused:   'from-amber-400 to-orange-500',
  closed:   'from-gray-300 to-gray-400',
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: '超級管理員',
  manager: '店長',
  shareholder: '股東',
}

interface StoreBasic {
  id: string
  name: string
  status: StoreStatus
}

export function StoreSidebar({ storeId, onClose }: { storeId: string; onClose?: () => void }) {
  const pathname = usePathname()
  const [store, setStore] = useState<StoreBasic | null>(null)
  const { user, profile, signOut } = useAuth()

  useEffect(() => {
    supabase
      .from('stores')
      .select('id, name, status')
      .eq('id', storeId)
      .single()
      .then(({ data }) => setStore(data))
  }, [storeId])

  const grad = store ? AVATAR_GRAD[store.status] : 'from-violet-500 to-purple-600'
  const displayName = profile?.display_name || user?.email?.split('@')[0] || '...'
  const roleLabel = profile?.title || (profile?.role ? ROLE_LABEL[profile.role] : '')

  return (
    <aside className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-full overflow-hidden">

      {/* Back */}
      <div className="px-4 pt-4 pb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors font-medium">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          所有店面
        </Link>
      </div>

      {/* Store info */}
      <div className="px-4 pb-4 border-b border-gray-100">
        <div
          className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center mb-2.5 shadow-lg`}
          style={{ boxShadow: '0 4px 12px 0 rgba(99,102,241,0.3)' }}
        >
          <span className="text-white text-base font-bold leading-none">
            {store?.name?.[0] ?? '…'}
          </span>
        </div>
        <h2 className="font-bold text-gray-900 text-sm leading-snug truncate">
          {store?.name ?? '載入中...'}
        </h2>
        {store?.status && (
          <span className={`inline-block mt-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${STATUS_BADGE[store.status]}`}>
            {STORE_STATUS_LABEL[store.status]}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-4">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-2 mb-1.5">
              {group.label}
            </p>
            {group.items.map(item => {
              const href = `/stores/${storeId}/${item.id}`
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center px-3 py-2 rounded-xl text-sm mb-0.5 font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={isActive ? { boxShadow: '0 4px 12px 0 rgba(249,115,22,0.35)' } : {}}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* SOP */}
      <div className="px-2.5 pt-2 border-t border-gray-100">
        <Link
          href="/sop"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            pathname.startsWith('/sop')
              ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
          style={pathname.startsWith('/sop') ? { boxShadow: '0 4px 12px 0 rgba(249,115,22,0.35)' } : {}}
        >
          SOP 知識庫
        </Link>
      </div>

      {/* User info + logout */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-gray-50">
          <Link href="/profile" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold leading-none">{displayName[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
              {roleLabel && <p className="text-[10px] text-gray-400 truncate">{roleLabel}</p>}
            </div>
          </Link>
          <button
            onClick={signOut}
            title="登出"
            className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
