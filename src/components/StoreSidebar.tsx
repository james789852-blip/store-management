'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { STORE_STATUS_LABEL } from '@/types'
import { STORE_STATUS_BADGE, STORE_STATUS_DOT } from '@/lib/colors'
import type { StoreStatus } from '@/types'

const NAV_GROUPS = [
  {
    key: 'manage',
    label: '管理',
    items: [
      { id: 'overview',   label: '總覽' },
      { id: 'budget',     label: '預算規劃' },
      { id: 'investors',  label: '股東收款' },
      { id: 'profit',     label: '月財報' },
      { id: 'portal',     label: '股東入口' },
      { id: 'basic',      label: '基本資料' },
      { id: 'expenses',   label: '費用記錄' },
      { id: 'design',     label: '設計資料' },
      { id: 'documents',  label: '文件管理' },
    ],
  },
  {
    key: 'build',
    label: '建置',
    items: [
      { id: 'schedule',   label: '建置排程' },
      { id: 'log',        label: '施工日誌' },
      { id: 'todos',      label: '待辦事項' },
      { id: 'vendors',    label: '廠商資料' },
    ],
  },
  {
    key: 'opening',
    label: '開幕',
    items: [
      { id: 'equipment',  label: '設備清單' },
      { id: 'gov',        label: '政府申請' },
      { id: 'opening',    label: '開幕確認' },
    ],
  },
]

// 依店面狀態決定「當前階段」，讓對應分區亮起
const STAGE_BY_STATUS: Record<StoreStatus, string> = {
  building: 'build',
  open:     'manage',
  paused:   'manage',
  closed:   'manage',
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

function openSearch() { window.dispatchEvent(new Event('open-search')) }

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

  const displayName = profile?.display_name || user?.email?.split('@')[0] || '...'
  const roleLabel = profile?.title || (profile?.role ? ROLE_LABEL[profile.role] : '')
  const currentStage = store ? STAGE_BY_STATUS[store.status] : null

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full overflow-hidden">

      {/* Back */}
      <div className="px-4 pt-4 pb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-900 transition-colors font-medium">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          所有店面
        </Link>
      </div>

      {/* Store info */}
      <div className="px-4 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center mb-2.5">
          <span className="text-white text-base font-bold leading-none">{store?.name?.[0] ?? '…'}</span>
        </div>
        <h2 className="font-bold text-gray-900 text-sm leading-snug truncate">{store?.name ?? '載入中...'}</h2>
        {store?.status && (
          <span className={`inline-flex items-center gap-1.5 mt-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${STORE_STATUS_BADGE[store.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STORE_STATUS_DOT[store.status]}`} />
            {STORE_STATUS_LABEL[store.status]}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <button
          onClick={openSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4-4" />
          </svg>
          <span className="text-xs">搜尋…</span>
          <kbd className="ml-auto text-[10px] border border-gray-200 rounded px-1 py-0.5">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_GROUPS.map(group => {
          const isCurrentStage = group.key === currentStage
          return (
            <div key={group.key} className="mb-4">
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{group.label}</p>
                {isCurrentStage && (
                  <span className="text-[9px] font-bold text-accent bg-accent-tint px-1.5 py-0.5 rounded-full">當前階段</span>
                )}
              </div>
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
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* SOP */}
      <div className="px-2.5 pt-2 border-t border-gray-100">
        <Link
          href="/sop"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            pathname.startsWith('/sop')
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          SOP 知識庫
        </Link>
      </div>

      {/* User info + logout */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-gray-50">
          <Link href="/profile" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold leading-none">{displayName[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
              {roleLabel && <p className="text-[10px] text-gray-400 truncate">{roleLabel}</p>}
            </div>
          </Link>
          <button onClick={signOut} title="登出" className="text-gray-300 hover:text-brand-red transition-colors shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
