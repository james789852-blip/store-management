'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { BudgetSettings, Expense } from '@/types'

const BUDGET_CATEGORIES = ['租約', '工程', '設備', '行政', '水電', '貨商', '文具雜支', '預備金'] as const
const CAT_COLORS: Record<string, string> = {
  '租約': 'bg-blue-100 text-blue-700',
  '工程': 'bg-amber-100 text-amber-700',
  '設備': 'bg-purple-100 text-purple-700',
  '行政': 'bg-indigo-100 text-indigo-700',
  '水電': 'bg-teal-100 text-teal-700',
  '貨商': 'bg-orange-100 text-orange-700',
  '文具雜支': 'bg-gray-100 text-gray-600',
  '預備金': 'bg-green-100 text-green-700',
}

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<'overview' | 'investor'>('overview')
  const [settings, setSettings] = useState<BudgetSettings | null>(null)
  const [expenses, setExpenses] = useState<Pick<Expense, 'category' | 'total' | 'pay_status'>[]>([])
  const [form, setForm] = useState({ sqft: '', price_per_sqft: '75000' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const [{ data: s }, { data: e }] = await Promise.all([
      supabase.from('budget_settings').select('*').eq('store_id', id).maybeSingle(),
      supabase.from('expenses').select('category, total, pay_status').eq('store_id', id),
    ])
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
    <div className="bg-gray-50 min-h-full p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">預算規劃</h1>
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
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">預算計算設定</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">坪數</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">每坪單價（元）</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.price_per_sqft} onChange={e => setForm(f => ({ ...f, price_per_sqft: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">對外募資上限</label>
                  <div className="mt-1 w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-500">
                    30%（固定）
                  </div>
                </div>
              </div>
              {sqft > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-xl text-sm">
                  <div><span className="text-gray-400">總預算：</span><span className="font-semibold text-gray-900">NT$ {totalBudget.toLocaleString()}</span></div>
                  <div><span className="text-gray-400">總估值：</span><span className="font-semibold text-gray-900">NT$ {Math.round(totalValuation).toLocaleString()}</span></div>
                  <div><span className="text-gray-400">1% 價值：</span><span className="font-semibold text-gray-900">NT$ {Math.round(onePercent).toLocaleString()}</span></div>
                </div>
              )}
              <button onClick={saveSettings} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: '總預算', value: totalBudget, color: 'text-blue-600' },
                { label: '實際支出', value: totalActual, color: 'text-gray-900' },
                { label: remaining >= 0 ? '預算剩餘' : '超支金額', value: Math.abs(remaining), color: remaining >= 0 ? 'text-teal-600' : 'text-red-500' },
                { label: '待付款', value: pending, color: 'text-amber-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>NT$ {card.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">費用類別明細</h2>
                <Link href={`/stores/${id}/expenses`} className="text-sm text-blue-600 hover:underline">前往費用記錄 →</Link>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['類別', '實際支出', '佔比'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {byCategory.map(({ cat, actual }) => (
                    <tr key={cat} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[cat]}`}>{cat}</span></td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{actual > 0 ? `NT$ ${actual.toLocaleString()}` : <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3">
                        {actual > 0 && totalActual > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (actual / totalActual) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{((actual / totalActual) * 100).toFixed(1)}%</span>
                          </div>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                    </tr>
                  ))}
                  {totalActual > 0 && (
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">合計</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">NT$ {totalActual.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm text-gray-400">100%</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {totalActual === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">尚無費用記錄</div>
              )}
            </div>
          </>
        )}

        {tab === 'investor' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">募資概況</h2>
              {sqft === 0 ? (
                <p className="text-amber-600 text-sm bg-amber-50 rounded-xl px-4 py-3">請先在「預算總覽」頁籤填入坪數和每坪單價</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
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
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 inline-block">
                前往股東收款 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
