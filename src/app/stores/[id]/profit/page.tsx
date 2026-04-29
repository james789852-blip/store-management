'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ProfitEstimate {
  id?: string
  monthly_revenue: number
  monthly_food_cost: number
  monthly_rent: number
  monthly_salary: number
  monthly_utilities: number
  monthly_other: number
}

const DEFAULT: ProfitEstimate = {
  monthly_revenue: 0,
  monthly_food_cost: 0,
  monthly_rent: 0,
  monthly_salary: 0,
  monthly_utilities: 0,
  monthly_other: 0,
}

export default function ProfitPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ProfitEstimate>(DEFAULT)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: row } = await supabase.from('profit_estimate').select('*').eq('store_id', id).single()
    if (row) {
      setRecordId(row.id)
      setData({
        monthly_revenue: row.monthly_revenue || 0,
        monthly_food_cost: row.monthly_food_cost || 0,
        monthly_rent: row.monthly_rent || 0,
        monthly_salary: row.monthly_salary || 0,
        monthly_utilities: row.monthly_utilities || 0,
        monthly_other: row.monthly_other || 0,
      })
    }
    setLoading(false)
  }

  async function saveData() {
    setSaving(true)
    const payload = { store_id: id, ...data }
    if (recordId) {
      await supabase.from('profit_estimate').update(payload).eq('id', recordId)
    } else {
      const { data: row } = await supabase.from('profit_estimate').insert(payload).select().single()
      if (row) setRecordId(row.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const totalCost = data.monthly_food_cost + data.monthly_rent + data.monthly_salary + data.monthly_utilities + data.monthly_other
  const grossProfit = data.monthly_revenue - data.monthly_food_cost
  const netProfit = data.monthly_revenue - totalCost
  const grossMargin = data.monthly_revenue > 0 ? (grossProfit / data.monthly_revenue * 100) : 0
  const netMargin = data.monthly_revenue > 0 ? (netProfit / data.monthly_revenue * 100) : 0
  const breakEvenRevenue = totalCost

  function field(label: string, key: keyof ProfitEstimate, hint?: string) {
    return (
      <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">NT$</span>
          <input
            type="number"
            className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={data[key] || ''}
            onChange={e => setData(d => ({ ...d, [key]: Number(e.target.value) || 0 }))}
          />
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">損益試算</h1>
          <p className="text-sm text-gray-400 mt-0.5">估算每月損益與損平點</p>
        </div>
        <button onClick={saveData} disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? '儲存中...' : saved ? '已儲存 ✓' : '儲存'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Input */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">月收入</h2>
          {field('每月營業額', 'monthly_revenue', '包含外送、內用、外帶')}

          <h2 className="font-semibold text-gray-900 mt-6 mb-4">月支出</h2>
          {field('食材成本', 'monthly_food_cost', '約為營業額的 30-35%')}
          {field('租金', 'monthly_rent')}
          {field('薪資人事', 'monthly_salary', '含勞健保、伙食津貼')}
          {field('水電瓦斯', 'monthly_utilities')}
          {field('其他雜費', 'monthly_other', '清潔、耗材、行銷等')}
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className={`rounded-2xl p-6 ${netProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="text-sm font-medium text-gray-600 mb-1">月淨利</p>
            <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {netProfit >= 0 ? '+' : ''}NT$ {netProfit.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">淨利率 {netMargin.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">損益分析</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">月營業額</dt>
                <dd className="font-semibold text-gray-800">NT$ {data.monthly_revenue.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">毛利</dt>
                <dd className="font-semibold text-gray-800">NT$ {grossProfit.toLocaleString()}
                  <span className="text-xs text-gray-400 ml-1">({grossMargin.toFixed(1)}%)</span>
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-sm text-gray-500">總支出</dt>
                <dd className="font-semibold text-red-600">NT$ {totalCost.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between pt-2">
                <dt className="text-sm text-gray-500">月淨利</dt>
                <dd className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  NT$ {netProfit.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">損平點分析</h3>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">損平月營業額</span>
              <span className="font-bold text-gray-800">NT$ {breakEvenRevenue.toLocaleString()}</span>
            </div>
            {data.monthly_revenue > 0 && (
              <>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all ${netProfit >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(100, data.monthly_revenue / breakEvenRevenue * 100 || 0)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-right">
                  達損平點 {breakEvenRevenue > 0 ? Math.min(100, Math.round(data.monthly_revenue / breakEvenRevenue * 100)) : 0}%
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">支出結構</h3>
            {totalCost > 0 && [
              { label: '食材', val: data.monthly_food_cost, color: 'bg-blue-400' },
              { label: '租金', val: data.monthly_rent, color: 'bg-purple-400' },
              { label: '薪資', val: data.monthly_salary, color: 'bg-amber-400' },
              { label: '水電', val: data.monthly_utilities, color: 'bg-green-400' },
              { label: '其他', val: data.monthly_other, color: 'bg-gray-300' },
            ].filter(x => x.val > 0).map(({ label, val, color }) => (
              <div key={label} className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{label}</span>
                  <span>{(val / totalCost * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${val / totalCost * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
