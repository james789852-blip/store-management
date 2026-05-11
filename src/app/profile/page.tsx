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
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

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
    window.location.reload()
  }

  async function changePassword() {
    setPwError('')
    if (newPassword.length < 6) { setPwError('密碼至少 6 個字元'); return }
    if (newPassword !== confirmPassword) { setPwError('兩次密碼不一致'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 3000)
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
              {(profile?.title || profile?.role) && (
                <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">
                  {profile.title || ROLE_LABEL[profile.role]}
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

        {/* Change password */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 mt-4">
          <h3 className="font-bold text-gray-900 text-sm">設定密碼</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">新密碼</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                placeholder="至少 6 個字元"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowNewPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                {showNewPw ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">確認密碼</label>
            <div className="relative">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                placeholder="再輸入一次"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                {showConfirmPw ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                )}
              </button>
            </div>
          </div>
          {pwError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{pwError}</div>
          )}
          {pwSaved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">✓ 密碼已更新</div>
          )}
          <button
            onClick={changePassword}
            disabled={pwSaving || !newPassword || !confirmPassword}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-white py-3 rounded-xl text-sm font-bold hover:from-orange-600 hover:to-amber-500 disabled:opacity-40 transition-all"
            style={{ boxShadow: '0 4px 16px 0 rgba(249,115,22,0.45)' }}
          >
            {pwSaving ? '更新中...' : '更新密碼'}
          </button>
        </div>
      </main>
    </div>
  )
}
