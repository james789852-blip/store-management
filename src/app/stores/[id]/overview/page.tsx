'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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

const ALL_STATUSES = ['建置中', '試營運', '營運中', '暫停', '歇業']

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Store>>({})
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ expenses: 0, todos: 0, todosDone: 0, logs: 0 })
  const [recentLogs, setRecentLogs] = useState<{ date: string; description: string; completion_pct: number | null }[]>([])
  const [upcomingTodos, setUpcomingTodos] = useState<{ title: string; due_date: string | null; priority: string }[]>([])

  useEffect(() => {
    loadAll()
  }, [id])

  async function loadAll() {
    const [{ data: storeData }, { data: expenses }, { data: todos }, { data: logs }] = await Promise.all([
      supabase.from('stores').select('*').eq('id', id).single(),
      supabase.from('expenses').select('amount').eq('store_id', id),
      supabase.from('todos').select('status').eq('store_id', id),
      supabase.from('construction_log').select('date, description, completion_pct').eq('store_id', id).order('date', { ascending: false }).limit(3),
    ])

    if (storeData) {
      setStore(storeData)
      setForm(storeData)
    }

    const totalExpenses = (expenses || []).reduce((s, e) => s + (e.amount || 0), 0)
    const todosDone = (todos || []).filter(t => t.status === '完成').length
    setStats({ expenses: totalExpenses, todos: todos?.length || 0, todosDone, logs: logs?.length || 0 })
    setRecentLogs(logs || [])

    const { data: pendingTodos } = await supabase.from('todos').select('title, due_date, priority')
      .eq('store_id', id).neq('status', '完成').order('due_date', { ascending: true }).limit(5)
    setUpcomingTodos(pendingTodos || [])

    setLoading(false)
  }

  async function saveStore() {
    setSaving(true)
    await supabase.from('stores').update({
      name: form.name,
      address: form.address || null,
      rent: form.rent || null,
      area: form.area || null,
      start_date: form.start_date || null,
      open_date: form.open_date || null,
      status: form.status,
      notes: form.notes || null,
    }).eq('id', id)
    setSaving(false)
    setEditing(false)
    loadAll()
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>
  if (!store) return <div className="flex items-center justify-center py-32 text-gray-400">找不到店面</div>

  const days = daysUntil(store.open_date)
  const buildDays = daysSince(store.start_date)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[store.status] || 'bg-gray-100 text-gray-500'}`}>
              {store.status}
            </span>
          </div>
          {store.address && <p className="text-gray-400 text-sm">{store.address}</p>}
        </div>
        <button onClick={() => setEditing(true)}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          編輯基本資料
        </button>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">累計費用</p>
          <p className="text-xl font-bold text-gray-900">NT$ {stats.expenses.toLocaleString()}</p>
          <Link href={`/stores/${id}/expenses`} className="text-xs text-blue-500 hover:underline mt-1 block">查看明細 →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">{days !== null && days >= 0 ? '距開幕' : '已開幕'}</p>
          <p className="text-xl font-bold text-gray-900">
            {days !== null ? `${Math.abs(days)} 天` : '未設定'}
          </p>
          {store.open_date && <p className="text-xs text-gray-400 mt-1">{store.open_date}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">待辦進度</p>
          <p className="text-xl font-bold text-gray-900">{stats.todosDone} / {stats.todos}</p>
          <Link href={`/stores/${id}/todos`} className="text-xs text-blue-500 hover:underline mt-1 block">查看待辦 →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">建置天數</p>
          <p className="text-xl font-bold text-gray-900">{buildDays !== null ? `${buildDays} 天` : '未設定'}</p>
          {store.start_date && <p className="text-xs text-gray-400 mt-1">自 {store.start_date}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">基本資訊</h2>
          <dl className="space-y-3">
            {[
              { label: '月租金', value: store.rent ? `NT$ ${store.rent.toLocaleString()}` : null },
              { label: '坪數', value: store.area ? `${store.area} 坪` : null },
              { label: '建置開始', value: store.start_date },
              { label: '預計開幕', value: store.open_date },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-sm text-gray-400">{label}</dt>
                <dd className="text-sm font-medium text-gray-800">{value || <span className="text-gray-300">未填</span>}</dd>
              </div>
            ))}
          </dl>
          {store.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">備註</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{store.notes}</p>
            </div>
          )}
        </div>

        {/* Recent log */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">最近施工日誌</h2>
            <Link href={`/stores/${id}/log`} className="text-xs text-blue-500 hover:underline">查看全部 →</Link>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">尚無日誌記錄</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">{log.date}</p>
                      {log.completion_pct !== null && (
                        <span className="text-xs text-gray-500">{log.completion_pct}%</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{log.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming todos */}
      {upcomingTodos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">未完成待辦</h2>
            <Link href={`/stores/${id}/todos`} className="text-xs text-blue-500 hover:underline">查看全部 →</Link>
          </div>
          <div className="space-y-2">
            {upcomingTodos.map((todo, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${todo.priority === '高' ? 'bg-red-400' : todo.priority === '中' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700 flex-1">{todo.title}</span>
                {todo.due_date && <span className="text-xs text-gray-400">{todo.due_date}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">編輯基本資料</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">店名 *</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">狀態</label>
                <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.status || ''} onChange={e => setForm(f => ({ ...f, status: e.target.value as Store['status'] }))}>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">地址</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">月租金</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.rent || ''} onChange={e => setForm(f => ({ ...f, rent: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">坪數</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.area || ''} onChange={e => setForm(f => ({ ...f, area: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">建置開始日</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value || null }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">預計開幕日</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.open_date || ''} onChange={e => setForm(f => ({ ...f, open_date: e.target.value || null }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <textarea rows={3} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setEditing(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={saveStore} disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
