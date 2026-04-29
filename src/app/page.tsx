'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types'
import Link from 'next/link'

const statusColor: Record<string, string> = {
  '建置中': 'bg-blue-100 text-blue-800',
  '試營運': 'bg-yellow-100 text-yellow-800',
  '營運中': 'bg-green-100 text-green-800',
  '暫停': 'bg-gray-100 text-gray-800',
  '歇業': 'bg-red-100 text-red-800',
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function Home() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
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
    await supabase.from('stores').insert({
      name: form.name,
      address: form.address || null,
      rent: form.rent ? Number(form.rent) : null,
      area: form.area ? Number(form.area) : null,
      start_date: form.start_date || null,
      open_date: form.open_date || null,
      status: '建置中',
    })
    setForm({ name: '', address: '', rent: '', area: '', start_date: '', open_date: '' })
    setShowAdd(false)
    setSaving(false)
    loadStores()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">店面建置管理系統</h1>
            <p className="text-sm text-gray-500 mt-0.5">管理所有店面的建置進度</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增店面
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400">載入中...</div>
        ) : stores.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">尚無店面資料</p>
            <button onClick={() => setShowAdd(true)} className="mt-4 text-blue-600 hover:underline text-sm">
              新增第一間店面
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stores.map(store => {
              const days = daysUntil(store.open_date)
              return (
                <Link key={store.id} href={`/stores/${store.id}`}>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h2 className="font-semibold text-gray-900 text-lg">{store.name}</h2>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[store.status] || 'bg-gray-100 text-gray-600'}`}>
                        {store.status}
                      </span>
                    </div>
                    {store.address && <p className="text-sm text-gray-500 mb-3 line-clamp-1">{store.address}</p>}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {store.rent && (
                        <div>
                          <span className="text-gray-400 text-xs">月租金</span>
                          <p className="font-medium text-gray-700">NT$ {store.rent.toLocaleString()}</p>
                        </div>
                      )}
                      {store.area && (
                        <div>
                          <span className="text-gray-400 text-xs">坪數</span>
                          <p className="font-medium text-gray-700">{store.area} 坪</p>
                        </div>
                      )}
                    </div>
                    {days !== null && (
                      <div className={`mt-3 pt-3 border-t border-gray-100 text-sm font-medium
                        ${days < 0 ? 'text-green-600' : days <= 30 ? 'text-red-500' : 'text-blue-600'}`}>
                        {days < 0 ? `已開幕 ${Math.abs(days)} 天` : `距開幕 ${days} 天`}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">新增店面</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">店名 *</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：巷日雞肉飯" />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">地址</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 font-medium">月租金</label>
                  <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.rent} onChange={e => setForm(f => ({ ...f, rent: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-medium">坪數</label>
                  <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 font-medium">建置開始日</label>
                  <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-medium">預計開幕日</label>
                  <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.open_date} onChange={e => setForm(f => ({ ...f, open_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                取消
              </button>
              <button onClick={addStore} disabled={!form.name || saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '儲存中...' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
