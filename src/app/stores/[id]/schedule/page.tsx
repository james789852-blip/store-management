'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ScheduleItem } from '@/types'

const STATUSES: ScheduleItem['status'][] = ['待開始', '進行中', '完成', '延誤']

const STATUS_COLOR: Record<string, string> = {
  '待開始': 'bg-gray-100 text-gray-500',
  '進行中': 'bg-blue-100 text-blue-700',
  '完成': 'bg-green-100 text-green-700',
  '延誤': 'bg-red-100 text-red-600',
}

type ScheduleForm = {
  team: string; task: string; start_date: string; end_date: string
  status: '待開始' | '進行中' | '完成' | '延誤'; notes: string
}

function emptyForm(): ScheduleForm {
  return { team: '', task: '', start_date: '', end_date: '', status: '待開始', notes: '' }
}

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ScheduleForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('construction_schedule').select('*').eq('store_id', id).order('start_date', { ascending: true, nullsFirst: false }).order('order_index')
    setItems(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.task) return
    setSaving(true)
    const payload = {
      store_id: id,
      team: form.team || null,
      task: form.task,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      notes: form.notes || null,
      order_index: items.length,
    }
    if (editId) {
      await supabase.from('construction_schedule').update(payload).eq('id', editId)
    } else {
      await supabase.from('construction_schedule').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm())
    load()
  }

  async function updateStatus(itemId: string, status: ScheduleItem['status']) {
    await supabase.from('construction_schedule').update({ status }).eq('id', itemId)
    load()
  }

  async function deleteItem(itemId: string) {
    await supabase.from('construction_schedule').delete().eq('id', itemId)
    load()
  }

  function startEdit(item: ScheduleItem) {
    setForm({
      team: item.team || '', task: item.task,
      start_date: item.start_date || '', end_date: item.end_date || '',
      status: item.status, notes: item.notes || '',
    })
    setEditId(item.id)
    setShowAdd(true)
  }

  function exportPDF() {
    window.open(`/stores/${id}/schedule/print`, '_blank')
  }

  const done = items.filter(i => i.status === '完成').length

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">建置排程</h1>
          <p className="text-sm text-gray-400 mt-0.5">{done} / {items.length} 完成</p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button onClick={exportPDF}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors print:hidden">
              列印 / PDF
            </button>
          )}
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm()) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors print:hidden">
            + 新增工程
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無排程資料</p>
          <p className="text-sm">新增各工程項目，追蹤施工時程</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['工班/廠商', '工程項目', '開始日期', '完成日期', '狀態', '備註', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => {
                  const duration = item.start_date && item.end_date
                    ? Math.ceil((new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / 86400000)
                    : null
                  return (
                    <tr key={item.id} className="group hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.team || '-'}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.task}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.start_date || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {item.end_date || '-'}
                        {duration !== null && <span className="text-xs text-gray-400 ml-1">({duration}天)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.status}
                          onChange={e => updateStatus(item.id, e.target.value as ScheduleItem['status'])}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_COLOR[item.status]}`}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{item.notes || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity print:hidden">
                          <button onClick={() => startEdit(item)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                          <button onClick={() => deleteItem(item.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯工程' : '新增工程'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">工班 / 廠商</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} placeholder="例：水電工班" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">工程項目 *</label>
                  <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} placeholder="例：水電配管" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">開始日期</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">完成日期</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">狀態</label>
                <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
              <button onClick={save} disabled={!form.task || saving}
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
