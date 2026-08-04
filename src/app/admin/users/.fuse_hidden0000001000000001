'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type UserProfile = {
  id: string
  role: 'super_admin' | 'manager' | 'shareholder'
  display_name: string | null
  title: string | null
  email: string
  created_at: string
  stores: { id: string; name: string }[]
}

type InviteForm = { email: string; display_name: string; role: 'manager' | 'shareholder'; title: string }

const ROLE_LABEL: Record<string, string> = {
  super_admin: '超級管理員',
  manager: '管理人員',
  shareholder: '股東',
}
const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-violet-100 text-violet-700',
  manager:     'bg-blue-100 text-blue-700',
  shareholder: 'bg-emerald-100 text-emerald-700',
}

const ROLE_OPTIONS = [
  { label: '老闆', role: 'manager' as const, title: '老闆', hasTitle: false },
  { label: '管理人員', role: 'manager' as const, title: '管理人員', hasTitle: true },
  { label: '股東', role: 'shareholder' as const, title: '', hasTitle: false },
]

const EMPTY_INVITE: InviteForm = { email: '', display_name: '', role: 'manager', title: '老闆' }

const TITLE_OPTIONS = ['總監', '經理', '店長', '副店長', '顧問', '助理']

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
  const [editTitle, setEditTitle] = useState('')
  const [editRoleLabel, setEditRoleLabel] = useState<'老闆' | '管理人員' | '股東'>('管理人員')
  const [inviteRoleLabel, setInviteRoleLabel] = useState<'老闆' | '管理人員' | '股東'>('老闆')
  const [storeModal, setStoreModal] = useState<string | null>(null)
  const [allStores, setAllStores] = useState<{ id: string; name: string }[]>([])
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set())
  const [savingStores, setSavingStores] = useState(false)
  const [pwModal, setPwModal] = useState<{ id: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => { if (profile?.role === 'super_admin') loadUsers() }, [profile]) // eslint-disable-line

  async function loadUsers() {
    setLoading(true)
    const [{ data: profiles }, { data: members }, { data: allStores }] = await Promise.all([
      supabase.from('user_profiles').select('id, role, display_name, title, email, created_at').order('created_at'),
      supabase.from('store_members').select('user_id, store_id'),
      supabase.from('stores').select('id, name'),
    ])
    const storeById: Record<string, { id: string; name: string }> = {}
    allStores?.forEach(s => { storeById[s.id] = s })
    const storeMap: Record<string, { id: string; name: string }[]> = {}
    members?.forEach(m => {
      if (!storeMap[m.user_id]) storeMap[m.user_id] = []
      const store = storeById[m.store_id]
      if (store) storeMap[m.user_id].push(store)
    })
    setUsers((profiles ?? []).map(p => ({ ...p, stores: storeMap[p.id] ?? [] })))
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

  async function updateUser(userId: string) {
    let role: 'manager' | 'shareholder' = 'manager'
    let title: string | null = null
    if (editRoleLabel === '老闆') { role = 'manager'; title = '老闆' }
    else if (editRoleLabel === '管理人員') { role = 'manager'; title = editTitle.trim() || '管理人員' }
    else { role = 'shareholder'; title = null }
    await supabase.from('user_profiles').update({ role, title }).eq('id', userId)
    if (editRoleLabel === '老闆') {
      const { data: stores } = await supabase.from('stores').select('id')
      if (stores?.length) {
        await supabase.from('store_members').upsert(
          stores.map(s => ({ store_id: s.id, user_id: userId })),
          { onConflict: 'store_id,user_id' }
        )
      }
    }
    setEditingId(null)
    loadUsers()
  }

  async function deleteUser(userId: string) {
    if (!confirm('確定要刪除此使用者嗎？')) return
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    loadUsers()
  }

  async function openStoreModal(userId: string) {
    const [{ data: stores }, { data: members }] = await Promise.all([
      supabase.from('stores').select('id, name').order('created_at'),
      supabase.from('store_members').select('store_id').eq('user_id', userId),
    ])
    setAllStores(stores ?? [])
    setSelectedStores(new Set((members ?? []).map(m => m.store_id)))
    setStoreModal(userId)
  }

  async function saveStoreAccess() {
    if (!storeModal) return
    setSavingStores(true)
    const { data: current } = await supabase
      .from('store_members').select('store_id').eq('user_id', storeModal)
    const currentSet = new Set((current ?? []).map(m => m.store_id))
    const toAdd = [...selectedStores].filter(id => !currentSet.has(id))
    const toRemove = [...currentSet].filter(id => !selectedStores.has(id))
    if (toAdd.length) {
      await supabase.from('store_members').insert(toAdd.map(store_id => ({ store_id, user_id: storeModal })))
    }
    if (toRemove.length) {
      await supabase.from('store_members').delete()
        .eq('user_id', storeModal).in('store_id', toRemove)
    }
    setSavingStores(false)
    setStoreModal(null)
    loadUsers()
  }

  async function savePassword() {
    if (!pwModal || newPassword.length < 6) return
    setPwSaving(true)
    setPwError('')
    const res = await fetch(`/api/admin/users/${pwModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    const json = await res.json()
    setPwSaving(false)
    if (!res.ok) { setPwError(json.error || '更新失敗'); return }
    setPwSuccess(true)
    setTimeout(() => { setPwModal(null); setNewPassword(''); setPwSuccess(false) }, 1200)
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
            onClick={() => { setShowInvite(true); setInvite(EMPTY_INVITE); setInviteRoleLabel('老闆'); setInviteError(''); setInviteSuccess('') }}
            className="bg-gradient-to-r from-orange-500 to-amber-400 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:from-orange-600 hover:to-amber-500 transition-all shadow-lg"
          >
            + 邀請使用者
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-bold leading-none">
                        {(u.display_name || u.email)[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.display_name || '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                        <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold ${ROLE_BADGE[u.role]}`}>
                          {ROLE_LABEL[u.role]}
                        </span>
                      </div>
                      {u.title && <p className="text-xs text-gray-400 mt-0.5">{u.title}</p>}
                      {(u.role === 'super_admin' || u.title === '老闆') ? (
                        <p className="text-xs text-gray-400 mt-1">可存取：全部店面</p>
                      ) : u.stores.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {u.stores.map(s => (
                            <span key={s.id} className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full font-medium">{s.name}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-red-400 mt-1">尚未授權店面</p>
                      )}

                      {editingId === u.id ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={editRoleLabel}
                              onChange={e => {
                                const lbl = e.target.value as '老闆' | '管理人員' | '股東'
                                setEditRoleLabel(lbl)
                                if (lbl === '老闆') { setEditRole('manager'); setEditTitle('老闆') }
                                else if (lbl === '股東') { setEditRole('shareholder'); setEditTitle('') }
                                else { setEditRole('manager') }
                              }}
                              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                            >
                              <option value="老闆">老闆</option>
                              <option value="管理人員">管理人員</option>
                              <option value="股東">股東</option>
                            </select>
                            {editRoleLabel === '管理人員' && (
                              <select
                                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                              >
                                <option value="">職稱（選填）</option>
                                {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateUser(u.id)} className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">確認</button>
                            <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors">取消</button>
                          </div>
                        </div>
                      ) : u.role !== 'super_admin' ? (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              setEditingId(u.id)
                              setEditRole(u.role as 'manager' | 'shareholder')
                              setEditTitle(u.title ?? '')
                              const lbl = u.title === '老闆' ? '老闆' : u.role === 'shareholder' ? '股東' : '管理人員'
                              setEditRoleLabel(lbl as '老闆' | '管理人員' | '股東')
                            }}
                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                          >編輯</button>
                          <button onClick={() => openStoreModal(u.id)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors">店面</button>
                          <button onClick={() => { setPwModal({ id: u.id, name: u.display_name || u.email }); setNewPassword(''); setPwError(''); setPwSuccess(false) }} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors">密碼</button>
                          <button onClick={() => deleteUser(u.id)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors">刪除</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden sm:table w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">使用者</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">角色</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">加入時間</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">可存取店面</th>
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
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={editRoleLabel}
                              onChange={e => {
                                const lbl = e.target.value as '老闆' | '管理人員' | '股東'
                                setEditRoleLabel(lbl)
                                if (lbl === '老闆') { setEditRole('manager'); setEditTitle('老闆') }
                                else if (lbl === '股東') { setEditRole('shareholder'); setEditTitle('') }
                                else { setEditRole('manager') }
                              }}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                            >
                              <option value="老闆">老闆</option>
                              <option value="管理人員">管理人員</option>
                              <option value="股東">股東</option>
                            </select>
                            {editRoleLabel === '管理人員' && (
                              <select
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                              >
                                <option value="">職稱（選填）</option>
                                {TITLE_OPTIONS.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateUser(u.id)} className="text-xs px-2 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">確認</button>
                            <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold ${ROLE_BADGE[u.role]}`}>
                            {ROLE_LABEL[u.role]}
                          </span>
                          {u.title && <p className="text-xs text-gray-400 mt-1">{u.title}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-TW')}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {u.role === 'super_admin' || u.title === '老闆' ? (
                        <span className="text-xs text-gray-400">全部店面</span>
                      ) : u.stores.length === 0 ? (
                        <span className="text-xs text-red-400">尚未授權</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.stores.map(s => (
                            <span key={s.id} className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full font-medium">{s.name}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {u.role !== 'super_admin' && (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => {
                              setEditingId(u.id)
                              setEditRole(u.role as 'manager' | 'shareholder')
                              setEditTitle(u.title ?? '')
                              const lbl = u.title === '老闆' ? '老闆' : u.role === 'shareholder' ? '股東' : '管理人員'
                              setEditRoleLabel(lbl as '老闆' | '管理人員' | '股東')
                            }}
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                          >編輯</button>
                          <button onClick={() => openStoreModal(u.id)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors">店面</button>
                          <button onClick={() => { setPwModal({ id: u.id, name: u.display_name || u.email }); setNewPassword(''); setPwError(''); setPwSuccess(false) }} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors">密碼</button>
                          <button onClick={() => deleteUser(u.id)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors">刪除</button>
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

      {/* Store access modal */}
      {storeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm shadow-2xl overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 py-5" style={{ boxShadow: '0 4px 24px 0 rgba(249,115,22,0.3)' }}>
              <h2 className="font-bold text-white text-lg">店面存取權限</h2>
              <p className="text-sm text-blue-200 mt-0.5">勾選此使用者可以看到的店面</p>
            </div>
            <div className="bg-white">
            <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
              {allStores.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">尚無店面</p>
              ) : allStores.map(store => (
                <label key={store.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStores.has(store.id)}
                    onChange={e => {
                      const next = new Set(selectedStores)
                      if (e.target.checked) next.add(store.id)
                      else next.delete(store.id)
                      setSelectedStores(next)
                    }}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-800 font-medium">{store.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setStoreModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors font-medium">
                取消
              </button>
              <button onClick={saveStoreAccess} disabled={savingStores}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-400 text-white py-2.5 rounded-xl text-sm font-bold hover:from-orange-600 hover:to-amber-500 disabled:opacity-40 transition-all shadow-md"
                style={{ boxShadow: '0 4px 14px 0 rgba(249,115,22,0.45)' }}>
                {savingStores ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Password modal */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm shadow-2xl overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 py-5">
              <h2 className="font-bold text-white text-lg">修改密碼</h2>
              <p className="text-sm text-blue-200 mt-0.5">{pwModal.name}</p>
            </div>
            <div className="bg-white p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">新密碼（至少 6 個字元）</label>
                <input
                  type="password"
                  autoFocus
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="輸入新密碼"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPwError('') }}
                  onKeyDown={e => { if (e.key === 'Enter' && newPassword.length >= 6) savePassword() }}
                />
              </div>
              {pwError && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{pwError}</p>}
              {pwSuccess && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">✓ 密碼已更新</p>}
            </div>
            <div className="bg-white flex gap-2 px-6 pb-6">
              <button onClick={() => setPwModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors font-medium">取消</button>
              <button
                onClick={savePassword}
                disabled={pwSaving || newPassword.length < 6}
                className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 text-white py-2.5 rounded-xl text-sm font-bold hover:from-purple-600 hover:to-violet-600 disabled:opacity-40 transition-all"
              >
                {pwSaving ? '更新中...' : '確認更新'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md shadow-2xl overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 py-5" style={{ boxShadow: '0 4px 24px 0 rgba(249,115,22,0.3)' }}>
              <h2 className="font-bold text-white text-lg">邀請使用者</h2>
              <p className="text-sm text-blue-200 mt-0.5">系統將發送設定密碼的郵件</p>
            </div>
            <div className="bg-white">
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
                  value={inviteRoleLabel}
                  onChange={e => {
                    const lbl = e.target.value as '老闆' | '管理人員' | '股東'
                    setInviteRoleLabel(lbl)
                    const opt = ROLE_OPTIONS.find(o => o.label === lbl)
                    if (opt) setInvite(f => ({ ...f, role: opt.role, title: opt.title }))
                  }}
                >
                  {ROLE_OPTIONS.map(o => (
                    <option key={o.label} value={o.label}>{o.label}</option>
                  ))}
                </select>
              </div>
              {inviteRoleLabel === '管理人員' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">職稱</label>
                  <select
                    className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                    value={invite.title}
                    onChange={e => setInvite(f => ({ ...f, title: e.target.value }))}
                  >
                    {TITLE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
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
        </div>
      )}
    </div>
  )
}
