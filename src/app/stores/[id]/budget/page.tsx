'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { BudgetSettings, BudgetItem } from '@/types'

const PRESET_ITEMS = ['拆除', '泥作', '水電', '木工', '油漆', '空調排煙', '廚房設備', '冷藏冷凍', '招牌', '監視系統', 'POS系統', '家具', '設計', '雜項']

function fmtM(n: number): string {
  if (n >= 1e8) return `NT$ ${(n / 1e8).toFixed(2)} 億`
  if (n >= 1e4) return `NT$ ${(n / 1e4).toFixed(n >= 1e6 ? 0 : 1)} 萬`
  return `NT$ ${n.toLocaleString()}`
}

type Draft = { name: string; planned_amount: string }
const EMPTY: Draft = { name: '', planned_amount: '' }

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>()
  const [settings, setSettings] = useState<BudgetSettings | null>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [sqft, setSqft] = useState('')
  const [actualTotal, setActualTotal] = useState(0)
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const [{ data: s }, { data: it }, { data: e }] = await Promise.all([
      supabase.from('budget_settings').select('*').eq('store_id', id).maybeSingle(),
      supabase.from('budget_items').select('*').eq('store_id', id).order('sort_order').order('created_at'),
      supabase.from('expenses').select('total').eq('store_id', id),
    ])
    if (s) {
      setSettings(s)
      const dbSqft = (s as Record<string, unknown>).ping_count ?? (s as Record<string, unknown>).sqft
      setSqft(dbSqft != null ? String(dbSqft) : '')
    }
    setItems((it || []) as BudgetItem[])
    setActualTotal((e || []).reduce((sum: number, x: { total: number | null }) => sum + (x.total || 0), 0))
  }

  const plannedTotal = items.reduce((s, i) => s + (i.planned_amount || 0), 0)
  const sqftNum = parseFloat(sqft) || 0
  const perPing = sqftNum > 0 ? plannedTotal / sqftNum : 0

  // 把總預算 / 坪數同步回 stores 與 budget_settings,供總覽等頁使用
  async function syncTotals(total: number, sqftVal: number | null) {
    await supabase.from('stores').update({ sqft: sqftVal, total_budget: total || null }).eq('id', id)
    if (settings) await supabase.from('budget_settings').update({ ping_count: sqftVal, total_budget: total || null }).eq('id', settings.id)
    else { const { data } = await supabase.from('budget_settings').insert({ store_id: id, ping_count: sqftVal, total_budget: total || null }).select().single(); if (data) setSettings(data) }
  }

  async function saveSqft() {
    await syncTotals(plannedTotal, sqftNum || null)
  }

  function startAdd() { setEditId(null); setDraft({ ...EMPTY }); setAdding(true) }
  function startEdit(it: BudgetItem) { setAdding(false); setEditId(it.id); setDraft({ name: it.name, planned_amount: it.planned_amount != null ? String(it.planned_amount) : '' }) }
  function cancel() { setAdding(false); setEditId(null); setDraft(EMPTY) }

  async function saveDraft() {
    if (!draft.name.trim()) return
    setBusy(true)
    const payload = { store_id: id, name: draft.name.trim(), planned_amount: draft.planned_amount ? Number(draft.planned_amount) : null }
    let next: BudgetItem[]
    if (editId) {
      await supabase.from('budget_items').update(payload).eq('id', editId)
      next = items.map(i => i.id === editId ? { ...i, ...payload } as BudgetItem : i)
    } else {
      const { data } = await supabase.from('budget_items').insert({ ...payload, sort_order: items.length }).select().single()
      next = data ? [...items, data as BudgetItem] : items
    }
    setItems(next)
    await syncTotals(next.reduce((s, i) => s + (i.planned_amount || 0), 0), sqftNum || null)
    setBusy(false); cancel()
  }

  async function remove(itemId: string) {
    if (!confirm('刪除這個預算項目？')) return
    await supabase.from('budget_items').delete().eq('id', itemId)
    const next = items.filter(i => i.id !== itemId)
    setItems(next)
    await syncTotals(next.reduce((s, i) => s + (i.planned_amount || 0), 0), sqftNum || null)
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent'
  const overBudget = actualTotal > plannedTotal && plannedTotal > 0

  const editor = (
    <div className="border border-accent rounded-xl p-3 space-y-2 bg-accent-tint/40">
      <input className={inputCls} list="budget-presets" placeholder="項目名稱 *（例:泥作、廚房設備）" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
      <datalist id="budget-presets">{PRESET_ITEMS.map(p => <option key={p} value={p} />)}</datalist>
      <input className={inputCls} type="number" placeholder="預估金額（元）" value={draft.planned_amount} onChange={e => setDraft(d => ({ ...d, planned_amount: e.target.value }))} />
      <div className="flex gap-2 pt-1">
        <button onClick={cancel} className="lp-btn-ghost flex-1 py-1.5 text-xs">取消</button>
        <button onClick={saveDraft} disabled={busy || !draft.name.trim()} className="lp-btn-primary flex-1 py-1.5 text-xs">{busy ? '儲存中...' : '儲存'}</button>
      </div>
    </div>
  )

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">預算規劃</h1>
            <p className="text-sm text-gray-400 mt-0.5">編列預估成本，算出每坪要花多少</p>
          </div>
          <Link href={`/stores/${id}/investors`} className="lp-btn-ghost px-4 py-2 text-sm">股東收款 →</Link>
        </div>

        {/* 每坪成本 hero */}
        <div className="lp-card p-5 mb-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">每坪成本</p>
              <p className="text-3xl font-bold text-gray-900">
                {perPing > 0 ? <>NT$ {Math.round(perPing).toLocaleString()}<span className="text-base font-medium text-gray-400"> / 坪</span></> : <span className="text-gray-300 text-2xl">填坪數後計算</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">預估總預算</p>
              <p className="text-2xl font-bold text-accent">{fmtM(plannedTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <label className="text-sm text-gray-600 shrink-0">店面坪數</label>
            <input type="number" value={sqft} onChange={e => setSqft(e.target.value)} onBlur={saveSqft} placeholder="0"
              className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            <span className="text-sm text-gray-400">坪</span>
            <span className="text-xs text-gray-400 ml-auto">= 預估總預算 ÷ 坪數</span>
          </div>
        </div>

        {/* 預算編列 */}
        <div className="lp-card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">預算編列</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">把每一項預估成本抓出來，加總就是總預算</p>
            </div>
            {!adding && !editId && <button onClick={startAdd} className="text-xs text-accent hover:opacity-70 font-medium">＋ 新增項目</button>}
          </div>

          <div className="space-y-1.5">
            {items.map(it => editId === it.id ? (
              <div key={it.id}>{editor}</div>
            ) : (
              <div key={it.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group transition-colors">
                <span className="flex-1 text-sm text-gray-800 truncate">{it.name}</span>
                <span className="text-sm font-medium text-gray-900">{it.planned_amount != null ? `NT$ ${it.planned_amount.toLocaleString()}` : <span className="text-gray-300">未填</span>}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => startEdit(it)} className="text-xs text-accent hover:opacity-70 px-1.5 py-1">編輯</button>
                  <button onClick={() => remove(it.id)} className="text-xs text-brand-red hover:opacity-70 px-1.5 py-1">刪除</button>
                </div>
              </div>
            ))}
            {items.length === 0 && !adding && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-3">還沒有預算項目,把預計要花的項目加進來</p>
                <button onClick={startAdd} className="lp-btn-primary px-5 py-2 text-sm">＋ 新增第一個項目</button>
              </div>
            )}
            {adding && editor}
          </div>

          {items.length > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">預估總預算 · {items.length} 項</span>
              <span className="text-base font-bold text-gray-900">{fmtM(plannedTotal)}</span>
            </div>
          )}
        </div>

        {/* 實際 vs 預估 */}
        {plannedTotal > 0 && actualTotal > 0 && (
          <div className="lp-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">實際 vs 預估</span>
              <span className="text-[13px] text-gray-500">已花 <b className={overBudget ? 'text-brand-red' : 'text-gray-900'}>{fmtM(actualTotal)}</b> / 預估 {fmtM(plannedTotal)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (actualTotal / plannedTotal) * 100)}%`, background: overBudget ? '#D94F4F' : '#1D9E75' }} />
            </div>
            <p className={`text-xs font-medium mt-2 ${overBudget ? 'text-brand-red' : 'text-brand-teal'}`}>
              {overBudget ? `⚠ 已超出預估 ${fmtM(actualTotal - plannedTotal)}` : `✅ 尚在預估內,還剩 ${fmtM(plannedTotal - actualTotal)}`}
            </p>
            <div className="text-right mt-2"><Link href={`/stores/${id}/expenses`} className="text-xs text-accent hover:opacity-70">看費用明細 →</Link></div>
          </div>
        )}
      </div>
    </div>
  )
}
