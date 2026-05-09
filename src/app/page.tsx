'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { STORE_STATUS_LABEL } from '@/types'
import type { Store, StoreStatus } from '@/types'
import Link from 'next/link'

const ALL_FILTERS: Array<'all' | StoreStatus> = ['all', 'building', 'open', 'paused', 'closed']

const STATUS_GRAD: Record<StoreStatus, string> = {
  building: 'from-blue-500 to-indigo-600',
  open:     'from-emerald-400 to-teal-500',
  paused:   'from-amber-400 to-orange-500',
  closed:   'from-gray-300 to-gray-400',
}

const STATUS_BADGE: Record<StoreStatus, string> = {
  building: 'bg-blue-100 text-blue-700',
  open:     'bg-emerald-100 text-emerald-700',
  paused:   'bg-amber-100 text-amber-700',
  closed:   'bg-gray-100 text-gray-500',
}

const STATUS_GLOW: Record<StoreStatus, string> = {
  building: 'rgba(99,102,241,0.25)',
  open:     'rgba(16,185,129,0.2)',
  paused:   'rgba(245,158,11,0.25)',
  closed:   'rgba(156,163,175,0.2)',
}

const FILTER_LABEL: Record<'all' | StoreStatus, string> = {
  all: '全部', building: '建置中', open: '已開幕', paused: '暫停', closed: '已結束',
}

function daysUntil(d: string | null) {
  if (!d) return null
  const [y, m, day] = d.split('-').map(Number)
  const target = new Date(y, m - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: '超管',
  manager: '店長',
  shareholder: '股東',
}

export default function Home() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | StoreStatus>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', monthly_rent: '', sqft: '', open_date: '' })
  const [saving, setSaving] = useState(false)
  const isComposing = useRef(false)
  const { user, profile, signOut } = useAuth()

  useEffect(() => { loadStores() }, [])

  async function loadStores() {
    const { data } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
    setStores(data || [])
    setLoading(false)
  }

  async function addStore() {
    if (!form.name) return
    setSaving(true)
    const { data } = await supabase.from('stores').insert({
      name: form.name,
      address: form.address || null,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
      sqft: form.sqft ? Number(form.sqft) : null,
      open_date: form.open_date || null,
      status: 'building',
    }).select().single()
    setSaving(false)
    setShowAdd(false)
    setForm({ name: '', address: '', monthly_rent: '', sqft: '', open_date: '' })
    if (data) window.location.href = `/stores/${data.id}/overview`
    else loadStores()
  }

  const filtered = filter === 'all' ? stores : stores.filter(s => s.status === filter)
  const counts = (['building', 'open', 'paused', 'closed'] as StoreStatus[]).reduce((acc, s) => {
    acc[s] = stores.filter(st => st.status === s).length
    return acc
  }, {} as Record<StoreStatus, number>)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Header */}
      <header className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900" style={{ boxShadow: '0 4px 24px 0 rgba(30,64,175,0.45)' }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg">
              <img src="/logo.png" alt="logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">梁平 · 建置管理</h1>
              <p className="text-xs text-blue-200 mt-0.5">開發管理系統</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && stores.length > 0 && (
              <div className="flex items-center gap-4 mr-3">
                {(['building', 'open', 'paused'] as StoreStatus[]).filter(s => counts[s] > 0).map(s => (
                  <div key={s} className="text-center">
                    <p className="text-lg font-bold text-white leading-none">{counts[s]}</p>
                    <p className="text-[10px] text-blue-200 mt-0.5">{STORE_STATUS_LABEL[s]}</p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/sop"
              className="px-3.5 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/15 transition-colors font-medium">
              SOP 知識庫
            </Link>
            {profile?.role === 'super_admin' && (
              <Link href="/admin/users"
                className="px-3.5 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/15 transition-colors font-medium">
                使用者管理
              </Link>
            )}
            <button onClick={() => setShowAdd(true)}
              className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-400 transition-colors shadow-lg">
              + 新增店面
            </button>
            {/* User menu */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/20 ml-1">
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                  <span className="text-white text-xs font-bold leading-none">
                    {(profile?.display_name || user?.email || '?')[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-white text-xs font-semibold leading-none">
                    {profile?.display_name || user?.email?.split('@')[0]}
                  </p>
                  {profile?.role && (
                    <p className="text-blue-200 text-[10px] mt-0.5">{ROLE_LABEL[profile.role]}</p>
                  )}
                </div>
              </Link>
              <button
                onClick={signOut}
                title="登出"
                className="text-white/50 hover:text-white transition-colors ml-1"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Filter tabs */}
        {!loading && stores.length > 0 && (
          <div className="flex items-center gap-1.5 mb-7 bg-white border border-gray-200 rounded-2xl p-1.5 w-fit shadow-sm">
            {ALL_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
                style={filter === f ? { boxShadow: '0 3px 10px 0 rgba(249,115,22,0.4)' } : {}}
              >
                {FILTER_LABEL[f]}
                {f !== 'all' && counts[f] > 0 && (
                  <span className={`ml-1.5 text-xs ${filter === f ? 'opacity-70' : 'text-gray-400'}`}>
                    {counts[f]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-40 text-gray-400 text-sm">載入中...</div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-3xl flex items-center justify-center mb-5 text-3xl">
              🍗
            </div>
            <h2 className="text-gray-700 font-bold text-xl mb-1.5">尚無店面資料</h2>
            <p className="text-gray-400 text-sm mb-7">新增第一間店面，開始管理建置進度</p>
            <button onClick={() => setShowAdd(true)}
              className="bg-gradient-to-r from-orange-500 to-amber-400 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:from-orange-600 hover:to-amber-500 transition-all shadow-lg"
              style={{ boxShadow: '0 4px 16px 0 rgba(249,115,22,0.45)' }}>
              + 新增第一間店面
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(store => {
              const days = daysUntil(store.open_date)
              return (
                <Link key={store.id} href={`/stores/${store.id}/overview`}>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
                    {/* Top gradient bar */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${STATUS_GRAD[store.status]}`} />

                    <div className="p-5">
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex-1 min-w-0">
                          <h2 className="font-bold text-gray-900 text-base truncate">{store.name}</h2>
                          {store.address && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{store.address}</p>
                          )}
                        </div>
                        <span className={`ml-3 shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_BADGE[store.status]}`}>
                          {STORE_STATUS_LABEL[store.status]}
                        </span>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2.5 mb-4">
                        {store.monthly_rent ? (
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">月租金</p>
                            <p className="font-bold text-gray-800 text-sm">NT$ {store.monthly_rent.toLocaleString()}</p>
                          </div>
                        ) : null}
                        {store.sqft ? (
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">坪數</p>
                            <p className="font-bold text-gray-800 text-sm">{store.sqft} 坪</p>
                          </div>
                        ) : null}
                      </div>

                      {/* Days */}
                      {days !== null && (
                        <div className="pt-3 border-t border-gray-50">
                          <div
                            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
                              days < 0
                                ? 'bg-emerald-50 text-emerald-600'
                                : days <= 14
                                ? 'bg-red-50 text-red-500'
                                : 'bg-indigo-50 text-indigo-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              days < 0 ? 'bg-emerald-400' : days <= 14 ? 'bg-red-400' : 'bg-indigo-400'
                            }`} />
                            {days < 0 ? `已開幕 ${Math.abs(days)} 天` : `距開幕 ${days} 天`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* Add store modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">新增店面</h2>
              <p className="text-sm text-gray-400 mt-0.5">建立後可進入店面填寫詳細資料</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">店名 *</label>
                <input autoFocus
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  placeholder="例：梁平雞肉飯 中正店"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onCompositionStart={() => { isComposing.current = true }}
                  onCompositionEnd={() => { isComposing.current = false }}
                  onKeyDown={e => { if (e.key === 'Enter' && !isComposing.current) addStore() }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">地址</label>
                <input
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">月租金</label>
                  <input type="number"
                    className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                    value={form.monthly_rent}
                    onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">坪數</label>
                  <input type="number"
                    className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                    value={form.sqft}
                    onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">預計開幕日</label>
                <input type="date"
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  value={form.open_date}
                  onChange={e => setForm(f => ({ ...f, open_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => { setShowAdd(false); setForm({ name: '', address: '', monthly_rent: '', sqft: '', open_date: '' }) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors font-medium">
                取消
              </button>
              <button onClick={addStore} disabled={!form.name || saving}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-400 text-white py-2.5 rounded-xl text-sm font-bold hover:from-orange-600 hover:to-amber-500 disabled:opacity-40 transition-all shadow-md"
                style={{ boxShadow: '0 4px 14px 0 rgba(249,115,22,0.45)' }}>
                {saving ? '建立中...' : '建立店面'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
