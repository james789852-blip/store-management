'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types'
import Link from 'next/link'

const STATUS_COLOR: Record<string, string> = {
  '建置中': 'bg-blue-100 text-blue-700',
  '試營運': 'bg-amber-100 text-amber-700',
  '營運中': 'bg-green-100 text-green-700',
  '暫停': 'bg-gray-100 text-gray-500',
  '歇業': 'bg-red-100 text-red-600',
}

const STATUS_DOT: Record<string, string> = {
  '建置中': 'bg-blue-500',
  '試營運': 'bg-amber-500',
  '營運中': 'bg-green-500',
  '暫停': 'bg-gray-400',
  '歇業': 'bg-red-500',
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

const ALL_STATUSES = ['全部', '建置中', '試營運', '營運中', '暫停', '歇業']

export default function Home() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('全部')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', rent: '', area: '', start_date: '', open_date: '' })
  const [saving, setSaving] = useState(false)

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
      rent: form.rent ? Number(form.rent) : null,
      area: form.area ? Number(form.area) : null,
      start_date: form.start_date || null,
      open_date: form.open_date || null,
      status: '建置中',
    }).select().single()
    setSaving(false)
    setShowAdd(false)
    setForm({ name: '', address: '', rent: '', area: '', start_date: '', open_date: '' })
    loadStores()
    if (data) window.location.href = `/stores/${data.id}/overview`
  }

  const filtered = filter === '全部' ? stores : stores.filter(s => s.status === filter)
  const counts = ALL_STATUSES.slice(1).reduce((acc, s) => {
    acc[s] = stores.filter(st => st.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">店面建置管理系統</h1>
            <p className="text-sm text-gray-400 mt-0.5">管理所有店面的建置進度</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sop"
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors font-medium">
              SOP 知識庫
            </Link>
            <button onClick={() => setShowAdd(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + 新增店面
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {!loading && stores.length > 0 && (
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {s}
                {s !== '全部' && counts[s] > 0 && (
                  <span className={`ml-1.5 text-xs ${filter === s ? 'text-gray-300' : 'text-gray-400'}`}>
                    {counts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>
        ) : filtered.length === 0 && stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">🏪</span>
            </div>
            <h2 className="text-gray-700 font-semibold text-lg mb-1">尚無店面資料</h2>
            <p className="text-gray-400 text-sm mb-5">新增第一間店面，開始管理建置進度</p>
            <button onClick={() => setShowAdd(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + 新增第一間店面
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(store => {
              const days = daysUntil(store.open_date)
              return (
                <Link key={store.id} href={`/stores/${store.id}/overview`}>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-gray-900 text-base truncate group-hover:text-blue-600 transition-colors">
                          {store.name}
                        </h2>
                        {store.address && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{store.address}</p>
                        )}
                      </div>
                      <span className={`ml-3 flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[store.status] || 'bg-gray-100 text-gray-500'}`}>
                        {store.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {store.rent && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-0.5">月租金</p>
                          <p className="font-semibold text-gray-800 text-sm">NT$ {store.rent.toLocaleString()}</p>
                        </div>
                      )}
                      {store.area && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-0.5">坪數</p>
                          <p className="font-semibold text-gray-800 text-sm">{store.area} 坪</p>
                        </div>
                      )}
                    </div>

                    {days !== null && (
                      <div className={`mt-3 pt-3 border-t border-gray-100 flex items-center gap-2`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[store.status] || 'bg-gray-400'}`} />
                        <span className={`text-sm font-medium ${days < 0 ? 'text-green-600' : days <= 14 ? 'text-red-500' : 'text-gray-600'}`}>
                          {days < 0 ? `已開幕 ${Math.abs(days)} 天` : `距開幕 ${days} 天`}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-1">新增店面</h2>
            <p className="text-sm text-gray-400 mb-5">建立後可以進入店面設定詳細資料</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">店名 *</label>
                <input
                  autoFocus
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addStore()}
                  placeholder="例：巷日雞肉飯"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">地址</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">月租金</label>
                  <input type="number"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.rent} onChange={e => setForm(f => ({ ...f, rent: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">坪數</label>
                  <input type="number"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">建置開始日</label>
                  <input type="date"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">預計開幕日</label>
                  <input type="date"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.open_date} onChange={e => setForm(f => ({ ...f, open_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setShowAdd(false); setForm({ name: '', address: '', rent: '', area: '', start_date: '', open_date: '' }) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button
                onClick={addStore}
                disabled={!form.name || saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '建立中...' : '建立店面'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
