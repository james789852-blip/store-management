'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Quote {
  id: string
  vendor_id: string
  store_id: string | null
  item: string
  spec: string | null
  unit: string | null
  price: number | null
  quote_date: string | null
  note: string | null
  created_at: string
}

interface StoreName { id: string; name: string }

type Draft = { item: string; spec: string; unit: string; price: string; quote_date: string; note: string }
const EMPTY: Draft = { item: '', spec: '', unit: '', price: '', quote_date: '', note: '' }

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent'

export default function VendorQuotes({ vendorId, storeId }: { vendorId: string; storeId: string }) {
  const [rows, setRows] = useState<Quote[]>([])
  const [storeMap, setStoreMap] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [vendorId]) // eslint-disable-line

  async function load() {
    const { data } = await supabase.from('vendor_quotes').select('*').eq('vendor_id', vendorId).order('quote_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    const list = (data || []) as Quote[]
    setRows(list)
    const storeIds = Array.from(new Set(list.map(q => q.store_id).filter(Boolean))) as string[]
    if (storeIds.length) {
      const { data: s } = await supabase.from('stores').select('id, name').in('id', storeIds)
      const map: Record<string, string> = {}
      ;(s as StoreName[] | null)?.forEach(r => { map[r.id] = r.name })
      setStoreMap(map)
    }
  }

  function startAdd() { setEditId(null); setDraft({ ...EMPTY, quote_date: new Date().toISOString().slice(0, 10) }); setAdding(true) }
  function startEdit(q: Quote) {
    setAdding(false); setEditId(q.id)
    setDraft({ item: q.item, spec: q.spec ?? '', unit: q.unit ?? '', price: q.price != null ? String(q.price) : '', quote_date: q.quote_date ?? '', note: q.note ?? '' })
  }
  function cancel() { setAdding(false); setEditId(null); setDraft(EMPTY) }

  async function saveDraft() {
    if (!draft.item.trim()) return
    setBusy(true)
    const payload = {
      vendor_id: vendorId,
      store_id: storeId,
      item: draft.item.trim(),
      spec: draft.spec || null,
      unit: draft.unit || null,
      price: draft.price ? Number(draft.price) : null,
      quote_date: draft.quote_date || null,
      note: draft.note || null,
    }
    if (editId) await supabase.from('vendor_quotes').update(payload).eq('id', editId)
    else await supabase.from('vendor_quotes').insert(payload)
    setBusy(false); cancel(); load()
  }

  async function remove(id: string) {
    if (!confirm('確定要刪除這筆報價？')) return
    await supabase.from('vendor_quotes').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const editor = (
    <div className="border border-accent rounded-xl p-3 space-y-2 bg-accent-tint/40">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={`${inputCls} sm:col-span-2`} placeholder="品項 / 工程項目 *（例:水電配管）" value={draft.item} onChange={e => setDraft(d => ({ ...d, item: e.target.value }))} />
        <input className={inputCls} placeholder="規格（選填）" value={draft.spec} onChange={e => setDraft(d => ({ ...d, spec: e.target.value }))} />
        <input className={inputCls} placeholder="單位（式/坪/台…）" value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))} />
        <input className={inputCls} type="number" placeholder="報價金額" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} />
        <input className={inputCls} type="date" value={draft.quote_date} onChange={e => setDraft(d => ({ ...d, quote_date: e.target.value }))} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="備註（選填）" value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={cancel} className="lp-btn-ghost flex-1 py-1.5 text-xs">取消</button>
        <button onClick={saveDraft} disabled={busy || !draft.item.trim()} className="lp-btn-primary flex-1 py-1.5 text-xs">{busy ? '儲存中...' : '儲存'}</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">歷史報價</p>
        {!adding && !editId && <button onClick={startAdd} className="text-xs text-accent hover:opacity-70 font-medium">＋ 新增報價</button>}
      </div>

      <div className="space-y-2">
        {rows.map(q => editId === q.id ? (
          <div key={q.id}>{editor}</div>
        ) : (
          <div key={q.id} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl group">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{q.item}</span>
                {q.price != null && <span className="text-sm font-bold text-accent">NT$ {q.price.toLocaleString()}{q.unit ? ` / ${q.unit}` : ''}</span>}
              </div>
              <div className="flex flex-wrap gap-x-2 mt-0.5 text-[11px] text-gray-400">
                {q.quote_date && <span>{q.quote_date}</span>}
                {q.spec && <span>· {q.spec}</span>}
                {q.store_id && storeMap[q.store_id] && q.store_id !== storeId && <span className="text-accent">· {storeMap[q.store_id]}</span>}
                {q.note && <span>· {q.note}</span>}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => startEdit(q)} className="p-1 text-gray-400 hover:text-accent rounded hover:bg-white" aria-label="編輯">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => remove(q.id)} className="p-1 text-gray-400 hover:text-brand-red rounded hover:bg-white" aria-label="刪除">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && !adding && <p className="text-sm text-gray-400 text-center py-3">尚無報價記錄，新增後日後可對照</p>}
        {adding && editor}
      </div>
    </div>
  )
}
