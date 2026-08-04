'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const SAVED_EMAIL_KEY = 'login_saved_email'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY)
    if (saved) { setEmail(saved); setRememberEmail(true) }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    if (rememberEmail) localStorage.setItem(SAVED_EMAIL_KEY, email)
    else localStorage.removeItem(SAVED_EMAIL_KEY)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError('帳號或密碼錯誤')
    } else {
      window.location.href = '/'
    }
  }

  async function sendMagicLink() {
    if (!email) { setError('請先輸入電子郵件'); return }
    setMagicLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/profile` },
    })
    setMagicLoading(false)
    if (err) setError(err.message)
    else setMagicSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-3xl overflow-hidden mb-4 shadow-xl">
            <img src="/logo.png" alt="logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">梁平 · 建置管理</h1>
          <p className="text-blue-200 text-sm mt-1">開發管理系統</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8" style={{ boxShadow: '0 25px 60px 0 rgba(79,70,229,0.35)' }}>
          <h2 className="text-gray-900 font-bold text-xl mb-6">登入</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                電子郵件
              </label>
              <input
                type="email"
                autoFocus
                autoComplete="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                密碼
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={e => setRememberEmail(e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500"
              />
              <span className="text-sm text-gray-500">記住帳號</span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-400 text-white py-3 rounded-xl text-sm font-bold hover:from-orange-600 hover:to-amber-500 disabled:opacity-40 transition-all mt-2"
              style={{ boxShadow: '0 4px 16px 0 rgba(249,115,22,0.45)' }}
            >
              {loading ? '登入中...' : '登入'}
            </button>

            <div className="border-t border-gray-100 pt-4 mt-2">
              {magicSent ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 text-center">
                  ✓ 登入連結已寄出，請檢查信箱
                </div>
              ) : (
                <button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={magicLoading}
                  className="w-full text-sm text-gray-500 hover:text-orange-500 transition-colors py-2 disabled:opacity-40"
                >
                  {magicLoading ? '傳送中...' : '忘記密碼？傳送登入連結到信箱'}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-indigo-300 text-xs mt-6">
          如需帳號請聯絡系統管理員
        </p>
      </div>
    </div>
  )
}
