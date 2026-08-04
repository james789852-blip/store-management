'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StoreStaff } from '@/types'

type Draft = { title: string; name: string; id_number: string; email: string; phone: string }
const EMPTY: Draft = { title: '副店長', name: '', id_number: '', email: '', phone: '' }

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent'

export default function StaffList({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<StoreStaff[]>([])
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [storeId]) // eslint-disable-line

  async function load() {
    const { data } = await supabase.from('store_staff').select('*').eq('store_id', storeId).order('sort_order').order('created_at')
    setRows((data || []) as StoreStaff[])
  }

  function startAdd() { setEditId(null); setDraft({ ...EMPTY }); setAdding(true) }
  function startEdit(s: StoreStaff) {
    setAdding(false); setEditId(s.id)
    setDraft({ title: s.title ?? '', name: s.name, id_number: s.id_number ?? '', email: s.email ?? '', phone: s.phone ?? '' })
  }
  function cancel() { setAdding(false); setEditId(null); setDraft(EMPTY) }

  async function saveDraft() {
    if (!draft.name.trim()) return
    setBusy(true)
    const payload = {
      store_id: storeId,
      title: draft.title || null,
      name: draft.name.trim(),
      id_number: draft.id_number || null,
      email: draft.email || null,
      phone: draft.phone || null,
    }
    if (editId) await supabase.from('store_staff').update(payload).eq('id', editId)
    else await supabase.from('store_staff').insert({ ...payload, sort_order: rows.length })
    setBusy(false); cancel(); load()
  }

  async function remove(id: string) {
    if (!confirm('確定要刪除這位人員？')) return
    await supabase.from('store_staff').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const editor = (
    <div className="border border-accent rounded-xl p-3 space-y-2 bg-accent-tint/40">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={inputCls} placeholder="職稱（例:店長 / 副店長）" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
        <input className={inputCls} placeholder="姓名 *" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        <input className={inputCls} placeholder="身分證字號" value={draft.id_number} onChange={e => setDraft(d => ({ ...d, id_number: e.target.value }))} />
        <input className={inputCls} placeholder="電話" value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="Email" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={cancel} className="lp-btn-ghost flex-1 py-1.5 text-xs">取消</button>
        <button onClick={saveDraft} disabled={busy || !draft.name.trim()} className="lp-btn-primary flex-1 py-1.5 text-xs">{busy ? '儲存中...' : '儲存'}</button>
      </div>
    </div>
  )

  return (
    <div className="lp-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">管理人員</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">店長、副店長等，可新增多位</p>
        </div>
        {!adding && !editId && <button onClick={startAdd} className="text-xs text-accent hover:opacity-70 font-medium">＋ 新增人員</button>}
      </div>

      <div className="space-y-2">
        {rows.map(s => editId === s.id ? (
          <div key={s.id}>{editor}</div>
        ) : (
          <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-sm font-bold text-white shrink-0">{s.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {s.name}
                {s.title && <span className="ml-2 text-[11px] font-medium text-accent bg-accent-tint px-1.5 py-0.5 rounded-full">{s.title}</span>}
              </p>
              <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-500">
                {s.phone && <span>📞 {s.phone}</span>}
                {s.email && <span className="truncate">{s.email}</span>}
                {s.id_number && <span>身分證 {s.id_number}</span>}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => startEdit(s)} className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-white transition-colors" aria-label="編輯">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => remove(s.id)} className="p-1.5 text-gray-400 hover:text-brand-red rounded-lg hover:bg-white transition-colors" aria-label="刪除">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 && !adding && <p className="text-sm text-gray-400 text-center py-4">尚無管理人員</p>}
        {adding && editor}
      </div>
    </div>
  )
}
