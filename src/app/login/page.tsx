'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError('帳號或密碼錯誤，請重新輸入')
    } else {
      window.location.href = '/'
    }
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
              <input
                type="password"
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

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
          </form>
        </div>

        <p className="text-center text-indigo-300 text-xs mt-6">
          如需帳號請聯絡系統管理員
        </p>
      </div>
    </div>
  )
}
