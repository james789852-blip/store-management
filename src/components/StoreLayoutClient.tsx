'use client'

import { useState } from 'react'
import { StoreSidebar } from './StoreSidebar'

export function StoreLayoutClient({ storeId, children }: { storeId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-full transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <StoreSidebar storeId={storeId} onClose={() => setOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-900 to-blue-800 sticky top-0 z-30 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-white/80 hover:text-white p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="text-white font-bold text-sm tracking-tight">梁平 · 建置管理</span>
        </div>

        {children}
      </div>
    </div>
  )
}
