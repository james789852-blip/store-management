'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { BudgetSettings, Expense } from '@/types'

const BUDGET_CATEGORIES = ['租約', '工程', '設備', '行政', '水電', '貨商', '文具雜支', '預備金'] as const
const CAT_ICON: Record<string, { icon: string; color: string }> = {
  '租約':     { icon: '🏠', color: '#534AB7' },
  '工程':     { icon: '🔨', color: '#B45309' },
  '設備':     { icon: '🧊', color: '#185FA5' },
  '行政':     { icon: '📋', color: '#5F5E5A' },
  '水電':     { icon: '💡', color: '#BA7517' },
  '貨商':     { icon: '📦', color: '#1D9E75' },
  '文具雜支': { icon: '✏️', color: '#888780' },
  '預備金':   { icon: '🪙', color: '#639922' },
}

function fmtM(n: number): string {
  if (n >= 1e8) return `NT$ ${(n / 1e8).toFixed(2)} 億`
  if (n >= 1e4) return `NT$ ${(n / 1e4).toFixed(n >= 1e6 ? 0 : 1)} 萬`
  return `NT$ ${n.toLocaleString()}`
}

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<'overview' | 'investor'>('overview')
  const [settings, setSettings] = useState<BudgetSettings | null>(null)
  const [expenses, setExpenses] = useState<Pick<Expense, 'category' | 'total' | 'pay_status'>[]>([])
  const [form, setForm] = useState({ sqft: '', price_per_sqft: '75000' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [schDone, setSchDone] = useState(0)
  const [schTotal, setSchTotal] = useState(0)

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const [{ data: s }, { data: e }, { data: sch }] = await Promise.all([
      supabase.from('budget_settings').select('*').eq('store_id', id).maybeSingle(),
      supabase.from('expenses').select('category, total, pay_status').eq('store_id', id),
      supabase.from('build_schedules').select('status').eq('store_id', id),
    ])
    setSchTotal((sch || []).length)
    setSchDone((sch || []).filter((x: { status: string }) => x.status === 'done').length)
    if (s) {
      setSettings(s)
      // DB uses ping_count / price_per_ping / released_pct
      const dbSqft = (s as Record<string, unknown>).ping_count ?? (s as Record<string, unknown>).sqft
      const dbPrice = (s as Record<string, unknown>).price_per_ping ?? (s as Record<string, unknown>).price_per_sqft
      setForm({
        sqft: dbSqft?.toString() ?? '',
        price_per_sqft: dbPrice?.toString() ?? '75000',
      })
    }
    setExpenses(e || [])
  }

  const sqft = parseFloat(form.sqft) || 0
  const pricePerSqft = parseFloat(form.price_per_sqft) || 75000
  const investorPct = 30 // 固定 30%，依據計算規格
  const totalBudget = sqft * pricePerSqft
  const totalValuation = sqft > 0 ? totalBudget / 0.3 : 0  // 總估值 = 總預算 ÷ 30%
  const totalActual = expenses.reduce((s, e) => s + (e.total || 0), 0)
  const paid = expenses.filter(e => e.pay_status === 'paid').reduce((s, e) => s + (e.total || 0), 0)
  const pending = totalActual - paid
  const remaining = totalBudget - totalActual
  const onePercent = totalValuation * 0.01

  const budgetPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0
  const schPct = schTotal > 0 ? Math.round((schDone / schTotal) * 100) : 0
  const healthColor = remaining < 0 ? '#D94F4F' : budgetPct >= 85 ? '#E0912A' : '#1D9E75'
  const verdict = remaining < 0
    ? { text: `⚠ 已超支 ${fmtM(-remaining)}，請留意`, cls: 'bg-brand-red-tint text-brand-red' }
    : (budgetPct - schPct > 10)
      ? { text: `⚠ 支出超前進度(花 ${budgetPct}%、做 ${schPct}%),有超支風險,建議控管`, cls: 'bg-brand-red-tint text-brand-red' }
      : (schPct - budgetPct > 5)
        ? { text: `✅ 支出低於進度(花 ${budgetPct}%、做 ${schPct}%),目前很健康`, cls: 'bg-brand-teal-tint text-brand-teal' }
        : { text: `支出與進度大致同步(花 ${budgetPct}%、做 ${schPct}%),正常`, cls: 'bg-brand-teal-tint text-brand-teal' }

  async function saveSettings() {
    setSaving(true)
    // Save using actual DB column names
    const dbPayload = {
      store_id: id,
      ping_count: sqft || null,
      price_per_ping: pricePerSqft,
      total_budget: totalBudget || null,
      released_pct: investorPct,
    }
    if (settings) {
      await supabase.from('budget_settings').update(dbPayload).eq('id', settings.id)
    } else {
      await supabase.from('budget_settings').insert(dbPayload)
    }
    // Also sync to stores table (uses correct column names)
    await supabase.from('stores').update({
      sqft: sqft || null,
      total_budget: totalBudget || null,
      price_per_sqft: pricePerSqft,
      total_valuation: totalValuation || null,
    }).eq('id', id)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); load()
  }

  const byCategory = BUDGET_CATEGORIES.map(cat => {
    const actual = expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.total || 0), 0)
    return { cat, actual }
  })

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">預算規劃</h1>
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {(['overview', 'investor'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                {t === 'overview' ? '預算總覽' : '股東連結'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'overview' && (
          <>
            {/* 預算健康 */}
            {totalBudget > 0 ? (
              <div className="lp-card p-5 mb-4">
                <div className="flex justify-between items-baseline mb-2.5">
                  <span className="text-sm font-semibold text-gray-800">預算健康</span>
                  <span className="text-[13px] text-gray-500">已花 <b className="text-gray-900">{fmtM(totalActual)}</b> / {fmtM(totalBudget)} · <b style={{ color: healthColor }}>{budgetPct}%</b></span>
                </div>
                <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, budgetPct)}%`, background: healthColor }} />
                </div>
                <div className="flex gap-8 mt-3.5">
                  <div><p className="text-[11px] text-gray-500">{remaining >= 0 ? '預算剩餘' : '超支金額'}</p><p className={`text-base font-bold ${remaining >= 0 ? 'text-gray-900' : 'text-brand-red'}`}>{fmtM(Math.abs(remaining))}</p></div>
                  <div><p className="text-[11px] text-gray-500">待付款</p><p className="text-base font-bold text-accent">{fmtM(pending)}</p></div>
                  <div><p className="text-[11px] text-gray-500">總估值</p><p className="text-base font-bold text-gray-900">{fmtM(totalValuation)}</p></div>
                </div>
              </div>
            ) : (
              <div className="lp-card p-4 mb-4 text-sm text-gray-500">請先在下方「預算計算設定」填入坪數與每坪單價，才能算出預算。</div>
            )}

            {/* 花費 vs 進度 */}
            {totalBudget > 0 && schTotal > 0 && (
              <div className="lp-card p-5 mb-4" style={{ borderColor: '#9FE1CB' }}>
                <p className="text-sm font-semibold text-gray-800 mb-3">花費 vs 進度</p>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">💰 預算使用</span><span className="font-medium">{budgetPct}%</span></div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, budgetPct)}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">🔨 工程完成</span><span className="font-medium">{schPct}%</span></div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-brand-teal rounded-full" style={{ width: `${schPct}%` }} /></div>
                  </div>
                </div>
                <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${verdict.cls}`}>{verdict.text}</div>
              </div>
            )}

            {/* 錢花在哪 · 各類別 */}
            <div className="lp-card p-5 mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-800">錢花在哪 · 各類別</span>
                <Link href={`/stores/${id}/expenses`} className="text-xs text-accent hover:opacity-70">前往費用記錄 →</Link>
              </div>
              {totalActual === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">尚無費用記錄</p>
              ) : (
                <div className="space-y-2.5">
                  {byCategory.filter(c => c.actual > 0).sort((a, b) => b.actual - a.actual).map(({ cat, actual }) => {
                    const m = CAT_ICON[cat] || { icon: '💰', color: '#888780' }
                    const pct = totalActual > 0 ? Math.round((actual / totalActual) * 100) : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{m.icon} {cat}</span><span className="font-medium text-gray-900">{fmtM(actual)} · {pct}%</span></div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.color }} /></div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 預算計算設定(收合) */}
            <details className="lp-card">
              <summary className="p-4 text-sm font-medium text-gray-700 cursor-pointer select-none">⚙ 預算計算設定(坪數、每坪單價)</summary>
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">坪數</label>
                    <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">每坪單價（元）</label>
                    <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      value={form.price_per_sqft} onChange={e => setForm(f => ({ ...f, price_per_sqft: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">對外募資上限</label>
                    <div className="mt-1 w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-500">30%（固定）</div>
                  </div>
                </div>
                <button onClick={saveSettings} disabled={saving} className="lp-btn-primary px-4 py-2 text-sm">
                  {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
                </button>
              </div>
            </details>
          </>
        )}

        {tab === 'investor' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">募資概況</h2>
              {sqft === 0 ? (
                <p className="text-amber-600 text-sm bg-amber-50 rounded-xl px-4 py-3">請先在「預算總覽」頁籤填入坪數和每坪單價</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: '總估值', value: Math.round(totalValuation) },
                    { label: `募資金額（${investorPct}%）`, value: Math.round(totalValuation * investorPct / 100) }, // investorPct = 30
                    { label: '1% 股份價值', value: Math.round(onePercent) },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                      <p className="text-lg font-bold text-gray-900">NT$ {item.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">前往股東收款頁管理投資人與付款狀態</p>
              <Link href={`/stores/${id}/investors`}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 inline-block">
                前往股東收款 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
