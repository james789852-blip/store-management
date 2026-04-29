'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Permit } from '@/types'

const STATUSES: Permit['status'][] = ['未申請', '申請中', '已取得', '不需要']

const STATUS_COLOR: Record<string, string> = {
  '未申請': 'bg-gray-100 text-gray-500',
  '申請中': 'bg-amber-100 text-amber-700',
  '已取得': 'bg-green-100 text-green-700',
  '不需要': 'bg-gray-50 text-gray-400',
}

const DEFAULT_PERMITS = [
  '營業登記', '食品業者登錄', '消防安全檢查', '建築使用執照', '招牌申請',
  '菸酒販售許可（如需要）', '音樂著作授權（如需要）', '廢棄物清理許可'
]

type PermitForm = {
  name: string; status: '未申請' | '申請中' | '已取得' | '不需要'
  applied_date: string; expected_date: string; completed_date: string; notes: string
}

function emptyForm(): PermitForm {
  return { name: '', status: '未申請', applied_date: '', expected_date: '', completed_date: '', notes: '' }
}

export default function PermitsPage() {
  const { id } = useParams<{ id: string }>()
  const [permits, setPermits] = useState<Permit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<PermitForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('permits').select('*').eq('store_id', id).order('order_index')
    setPermits(data || [])
    setLoading(false)
  }

  async function addDefaults() {
    const payload = DEFAULT_PERMITS.map((name, i) => ({
      store_id: id, name, status: '未申請' as const, order_index: i
    }))
    await supabase.from('permits').insert(payload)
    load()
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = {
      store_id: id,
      name: form.name,
      status: form.status,
      applied_date: form.applied_date || null,
      expected_date: form.expected_date || null,
      completed_date: form.completed_date || null,
      notes: form.notes || null,
      order_index: permits.length,
    }
    if (editId) {
      await supabase.from('permits').update(payload).eq('id', editId)
    } else {
      await supabase.from('permits').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm())
    load()
  }

  async function updateStatus(permitId: string, status: Permit['status']) {
    await supabase.from('permits').update({ status }).eq('id', permitId)
    load()
  }

  async function deletePermit(permitId: string) {
    await supabase.from('permits').delete().eq('id', permitId)
    load()
  }

  function startEdit(p: Permit) {
    setForm({
      name: p.name, status: p.status,
      applied_date: p.applied_date || '', expected_date: p.expected_date || '',
      completed_date: p.completed_date || '', notes: p.notes || '',
    })
    setEditId(p.id)
    setShowAdd(true)
  }

  const done = permits.filter(p => p.status === '已取得' || p.status === '不需要').length

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">政府申請</h1>
          <p className="text-sm text-gray-400 mt-0.5">{done} / {permits.length} 完成</p>
        </div>
        <div className="flex gap-2">
          {permits.length === 0 && (
            <button onClick={addDefaults}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              載入預設清單
            </button>
          )}
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm()) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增項目
          </button>
        </div>
      </div>

      {permits.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無申請項目</p>
          <p className="text-sm mb-4">可點「載入預設清單」快速建立常見申請項目</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {permits.map(p => (
              <div key={p.id} className="px-5 py-4 flex items-center gap-4 group">
                <select
                  value={p.status}
                  onChange={e => updateStatus(p.id, e.target.value as Permit['status'])}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_COLOR[p.status]}`}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                  <div className="flex gap-3 mt-0.5">
                    {p.applied_date && <span className="text-xs text-gray-400">申請：{p.applied_date}</span>}
                    {p.expected_date && <span className="text-xs text-gray-400">預計：{p.expected_date}</span>}
                    {p.completed_date && <span className="text-xs text-green-600">取得：{p.completed_date}</span>}
                  </div>
                  {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button onClick={() => startEdit(p)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                  <button onClick={() => deletePermit(p.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯申請項目' : '新增申請項目'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">申請名稱 *</label>
                <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">狀態</label>
                <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">申請日期</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.applied_date} onChange={e => setForm(f => ({ ...f, applied_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">預計取得日</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">實際取得日</label>
                <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.completed_date} onChange={e => setForm(f => ({ ...f, completed_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <textarea rows={2} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowAdd(false); setEditId(null) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={save} disabled={!form.name || saving}
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
