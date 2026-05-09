'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type UserProfile = {
  id: string
  role: 'super_admin' | 'manager' | 'shareholder'
  display_name: string | null
  email: string
  created_at: string
}

type InviteForm = { email: string; display_name: string; role: 'manager' | 'shareholder' }

const ROLE_LABEL: Record<string, string> = {
  super_admin: '超級管理員',
  manager: '店長',
  shareholder: '股東',
}
const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-violet-100 text-violet-700',
  manager:     'bg-blue-100 text-blue-700',
  shareholder: 'bg-emerald-100 text-emerald-700',
}

const EMPTY_INVITE: InviteForm = { email: '', display_name: '', role: 'manager' }

export default function AdminUsersPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState<InviteForm>(EMPTY_INVITE)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<'manager' | 'shareholder'>('manager')

  useEffect(() => { if (profile?.role === 'super_admin') loadUsers() }, [profile]) // eslint-disable-line

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select('id, role, display_name, email, created_at')
      .order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  async function sendInvite() {
    if (!invite.email || !invite.display_name) return
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invite),
    })
    const json = await res.json()
    setInviting(false)

    if (!res.ok) {
      setInviteError(json.error || '邀請失敗，請重試')
    } else {
      setInviteSuccess(`已發送邀請信至 ${invite.email}`)
      setInvite(EMPTY_INVITE)
      loadUsers()
    }
  }

  async function updateRole(userId: string) {
    await supabase.from('user_profiles').update({ role: editRole }).eq('id', userId)
    setEditingId(null)
    loadUsers()
  }

  async function deleteUser(userId: string) {
    if (!confirm('確定要刪除此使用者嗎？')) return
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    loadUsers()
  }

  if (profile?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">無權限存取此頁面</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900" style={{ boxShadow: '0 4px 24px 0 rgba(249,115,22,0.45)' }}>
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/60 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">使用者管理</h1>
              <p className="text-xs text-blue-200 mt-0.5">新增 · 編輯 · 移除系統帳號</p>
            </div>
          </div>
          <button
            onClick={() => { setShowInvite(true); setInvite(EMPTY_INVITE); setInviteError(''); setInviteSuccess('') }}
            className="bg-white text-blue-100 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-50 transition-colors shadow-lg"
          >
            + 邀請使用者
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">使用者</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">角色</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">加入時間</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold leading-none">
                            {(u.display_name || u.email)[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.display_name || '—'}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {editingId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={e => setEditRole(e.target.value as 'manager' | 'shareholder')}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                          >
                            <option value="manager">店長</option>
                            <option value="shareholder">股東</option>
                          </select>
                          <button onClick={() => updateRole(u.id)} className="text-xs px-2 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                            確認
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors">
                            取消
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold ${ROLE_BADGE[u.role]}`}>
                          {ROLE_LABEL[u.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-TW')}</span>
                    </td>
                    <td className="px-5 py-4">
                      {u.role !== 'super_admin' && (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => { setEditingId(u.id); setEditRole(u.role as 'manager' | 'shareholder') }}
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
                          >
                            刪除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">邀請使用者</h2>
              <p className="text-sm text-gray-400 mt-0.5">系統將發送設定密碼的郵件</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">電子郵件 *</label>
                <input
                  type="email"
                  autoFocus
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="user@example.com"
                  value={invite.email}
                  onChange={e => setInvite(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">姓名 *</label>
                <input
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="王小明"
                  value={invite.display_name}
                  onChange={e => setInvite(f => ({ ...f, display_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">角色</label>
                <select
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  value={invite.role}
                  onChange={e => setInvite(f => ({ ...f, role: e.target.value as 'manager' | 'shareholder' }))}
                >
                  <option value="manager">店長</option>
                  <option value="shareholder">股東</option>
                </select>
              </div>
              {inviteError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{inviteError}</div>
              )}
              {inviteSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">{inviteSuccess}</div>
              )}
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={sendInvite}
                disabled={inviting || !invite.email || !invite.display_name}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-400 text-white py-2.5 rounded-xl text-sm font-bold hover:from-orange-600 hover:to-amber-500 disabled:opacity-40 transition-all shadow-md"
                style={{ boxShadow: '0 4px 14px 0 rgba(249,115,22,0.45)' }}
              >
                {inviting ? '發送中...' : '發送邀請'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
