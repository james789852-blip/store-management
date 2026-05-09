'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ROLE_LABEL: Record<string, string> = {
  super_admin: '超級管理員',
  manager: '店長',
  shareholder: '股東',
}

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name)
  }, [profile])

  async function save() {
    if (!user) return
    setSaving(true)
    await supabase
      .from('user_profiles')
      .update({ display_name: displayName || null })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Refresh profile in context
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900" style={{ boxShadow: '0 4px 24px 0 rgba(249,115,22,0.45)' }}>
        <div className="max-w-lg mx-auto px-6 py-5 flex items-center gap-3">
          <Link href="/" className="text-white/60 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">個人設定</h1>
            <p className="text-xs text-indigo-200 mt-0.5">修改你的顯示名稱</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold leading-none">
                {(displayName || user?.email || '?')[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-900">{displayName || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
              {profile?.role && (
                <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">
                  {ROLE_LABEL[profile.role]}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              顯示名稱
            </label>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
              placeholder="輸入你的名稱"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-white py-3 rounded-xl text-sm font-bold hover:from-orange-600 hover:to-amber-500 disabled:opacity-40 transition-all"
            style={{ boxShadow: '0 4px 16px 0 rgba(249,115,22,0.45)' }}
          >
            {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
          </button>
        </div>
      </main>
    </div>
  )
}
