'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StorePayment } from '@/types'

type Draft = { method: string; commission_pct: string; settlement_rule: string; note: string }
const EMPTY: Draft = { method: '', commission_pct: '', settlement_rule: '', note: '' }
const PRESET = ['LinePay', 'ApplePay', 'GooglePay', '街口', '信用卡', '悠遊卡', '一卡通']

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent'

export default function PaymentList({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<StorePayment[]>([])
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [storeId]) // eslint-disable-line

  async function load() {
    const { data } = await supabase.from('store_payments').select('*').eq('store_id', storeId).order('sort_order').order('created_at')
    setRows((data || []) as StorePayment[])
  }

  function startAdd() { setEditId(null); setDraft({ ...EMPTY }); setAdding(true) }
  function startEdit(p: StorePayment) {
    setAdding(false); setEditId(p.id)
    setDraft({ method: p.method, commission_pct: p.commission_pct != null ? String(p.commission_pct) : '', settlement_rule: p.settlement_rule ?? '', note: p.note ?? '' })
  }
  function cancel() { setAdding(false); setEditId(null); setDraft(EMPTY) }

  async function saveDraft() {
    if (!draft.method.trim()) return
    setBusy(true)
    const payload = {
      store_id: storeId,
      method: draft.method.trim(),
      commission_pct: draft.commission_pct ? Number(draft.commission_pct) : null,
      settlement_rule: draft.settlement_rule || null,
      note: draft.note || null,
    }
    if (editId) await supabase.from('store_payments').update(payload).eq('id', editId)
    else await supabase.from('store_payments').insert({ ...payload, sort_order: rows.length })
    setBusy(false); cancel(); load()
  }

  async function remove(id: string) {
    if (!confirm('確定要刪除這個支付方式？')) return
    await supabase.from('store_payments').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const editor = (
    <div className="border border-accent rounded-xl p-3 space-y-2 bg-accent-tint/40">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <input className={inputCls} placeholder="支付方式 *（例:LinePay）" list="pay-methods" value={draft.method} onChange={e => setDraft(d => ({ ...d, method: e.target.value }))} />
          <datalist id="pay-methods">{PRESET.map(m => <option key={m} value={m} />)}</datalist>
        </div>
        <div className="relative">
          <input className={inputCls} type="number" step="0.01" placeholder="抽成 %（例:2.5）" value={draft.commission_pct} onChange={e => setDraft(d => ({ ...d, commission_pct: e.target.value }))} />
        </div>
        <input className={`${inputCls} sm:col-span-2`} placeholder="撥款規則 / 週期（例:T+2、每月 5 號入帳）" value={draft.settlement_rule} onChange={e => setDraft(d => ({ ...d, settlement_rule: e.target.value }))} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="備註（選填）" value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={cancel} className="lp-btn-ghost flex-1 py-1.5 text-xs">取消</button>
        <button onClick={saveDraft} disabled={busy || !draft.method.trim()} className="lp-btn-primary flex-1 py-1.5 text-xs">{busy ? '儲存中...' : '儲存'}</button>
      </div>
    </div>
  )

  return (
    <div className="lp-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">支付方式與抽成</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">各行動支付 / 信用卡的抽成 % 與撥款規則</p>
        </div>
        {!adding && !editId && <button onClick={startAdd} className="text-xs text-accent hover:opacity-70 font-medium">＋ 新增支付</button>}
      </div>

      <div className="space-y-2">
        {rows.map(p => editId === p.id ? (
          <div key={p.id}>{editor}</div>
        ) : (
          <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {p.method}
                {p.commission_pct != null && <span className="ml-2 text-[11px] font-medium text-accent bg-accent-tint px-1.5 py-0.5 rounded-full">抽 {p.commission_pct}%</span>}
              </p>
              <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-500">
                {p.settlement_rule && <span>撥款：{p.settlement_rule}</span>}
                {p.note && <span className="truncate">{p.note}</span>}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-white transition-colors" aria-label="編輯">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => remove(p.id)} className="p-1.5 text-gray-400 hover:text-brand-red rounded-lg hover:bg-white transition-colors" aria-label="刪除">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 && !adding && <p className="text-sm text-gray-400 text-center py-4">尚無支付方式</p>}
        {adding && editor}
      </div>
    </div>
  )
}
