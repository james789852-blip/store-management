'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ConstructionLog } from '@/types'

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    team: '',
    description: '',
    status: '',
    completion_pct: '',
    notes: '',
  }
}

export default function LogPage() {
  const { id } = useParams<{ id: string }>()
  const [logs, setLogs] = useState<ConstructionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('construction_log').select('*').eq('store_id', id).order('date', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.description) return
    setSaving(true)
    const payload = {
      store_id: id,
      date: form.date,
      team: form.team || null,
      description: form.description,
      status: form.status || null,
      completion_pct: form.completion_pct ? Number(form.completion_pct) : null,
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('construction_log').update(payload).eq('id', editId)
    } else {
      await supabase.from('construction_log').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm())
    load()
  }

  async function deleteLog(logId: string) {
    await supabase.from('construction_log').delete().eq('id', logId)
    load()
  }

  function startEdit(log: ConstructionLog) {
    setForm({
      date: log.date,
      team: log.team || '',
      description: log.description,
      status: log.status || '',
      completion_pct: log.completion_pct !== null ? String(log.completion_pct) : '',
      notes: log.notes || '',
    })
    setEditId(log.id)
    setShowAdd(true)
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">施工日誌</h1>
          <p className="text-sm text-gray-400 mt-0.5">共 {logs.length} 筆記錄</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm()) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + 新增日誌
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無施工日誌</p>
          <p className="text-sm">每天記錄施工進度，保留完整建置過程</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="relative flex gap-5 group">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center flex-shrink-0 z-10">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                </div>
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-5 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{log.date}</span>
                      {log.team && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{log.team}</span>}
                      {log.status && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{log.status}</span>}
                      {log.completion_pct !== null && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">完成 {log.completion_pct}%</span>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0 ml-2">
                      <button onClick={() => startEdit(log)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                      <button onClick={() => deleteLog(log.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{log.description}</p>
                  {log.notes && (
                    <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">{log.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯日誌' : '新增施工日誌'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">日期</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">施工團隊 / 工班</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} placeholder="例：水電工班" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">今日施工內容 *</label>
                <textarea autoFocus rows={5} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="描述今天的施工內容、進展..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">進度狀態</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} placeholder="例：進行中、暫停" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">整體完成度 (%)</label>
                  <input type="number" min="0" max="100" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.completion_pct} onChange={e => setForm(f => ({ ...f, completion_pct: e.target.value }))} placeholder="0-100" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註 / 問題</label>
                <textarea rows={2} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowAdd(false); setEditId(null) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={save} disabled={!form.description || saving}
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
