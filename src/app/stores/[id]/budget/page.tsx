'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { BudgetItem } from '@/types'

const CATEGORIES = ['裝潢工程', '設備採購', '家具軟裝', '招牌廣告', '行政費用', '備用金', '其他']

type Settings = {
  ping_count: string
  price_per_ping: string
  total_budget: string
  released_pct: string
}

type ItemForm = {
  category: string
  name: string
  estimated_amount: string
  notes: string
}

function emptyItemForm(): ItemForm {
  return { category: CATEGORIES[0], name: '', estimated_amount: '', notes: '' }
}

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyItemForm())
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    ping_count: '', price_per_ping: '', total_budget: '', released_pct: '30'
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const load = useCallback(async () => {
    const [{ data: itemsData }, { data: settingsData }] = await Promise.all([
      supabase.from('budget_items').select('*').eq('store_id', id).order('category').order('order_index'),
      supabase.from('budget_settings').select('*').eq('store_id', id).maybeSingle(),
    ])
    setItems(itemsData || [])
    if (settingsData) {
      setSettings({
        ping_count: settingsData.ping_count != null ? String(settingsData.ping_count) : '',
        price_per_ping: settingsData.price_per_ping != null ? String(settingsData.price_per_ping) : '',
        total_budget: settingsData.total_budget != null ? String(settingsData.total_budget) : '',
        released_pct: settingsData.released_pct != null ? String(Number(settingsData.released_pct) * 100) : '30',
      })
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const calculatedCost = settings.ping_count && settings.price_per_ping
    ? Number(settings.ping_count) * Number(settings.price_per_ping)
    : null

  const totalBudget = settings.total_budget ? Number(settings.total_budget) : calculatedCost
  const releasedPct = settings.released_pct ? Number(settings.released_pct) : 30
  const valuePerPct = totalBudget && releasedPct ? Math.round(totalBudget / releasedPct) : null

  async function saveSettings() {
    setSavingSettings(true)
    const payload = {
      store_id: id,
      ping_count: settings.ping_count ? Number(settings.ping_count) : null,
      price_per_ping: settings.price_per_ping ? Number(settings.price_per_ping) : null,
      total_budget: settings.total_budget ? Number(settings.total_budget) : (calculatedCost ?? null),
      released_pct: releasedPct / 100,
    }
    await supabase.from('budget_settings').upsert(payload, { onConflict: 'store_id' })
    setSavingSettings(false)
    load()
  }

  async function save() {
    if (!form.name || !form.estimated_amount) return
    setSaving(true)
    const payload = {
      store_id: id,
      category: form.category,
      name: form.name,
      estimated_amount: Number(form.estimated_amount),
      notes: form.notes || null,
      order_index: items.length,
    }
    if (editId) {
      await supabase.from('budget_items').update(payload).eq('id', editId)
    } else {
      await supabase.from('budget_items').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyItemForm())
    load()
  }

  async function deleteItem(itemId: string) {
    await supabase.from('budget_items').delete().eq('id', itemId)
    load()
  }

  function startEdit(item: BudgetItem) {
    setForm({ category: item.category, name: item.name, estimated_amount: String(item.estimated_amount), notes: item.notes || '' })
    setEditId(item.id)
    setShowAdd(true)
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat)
    return acc
  }, {} as Record<string, BudgetItem[]>)

  const total = items.reduce((s, i) => s + i.estimated_amount, 0)

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">預算規劃</h1>
          <p className="text-sm text-gray-400 mt-0.5">明細合計：NT$ {total.toLocaleString()}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyItemForm()) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + 新增項目
        </button>
      </div>

      {/* 費用試算設定 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 mb-6">
        <h2 className="font-semibold text-blue-900 text-sm mb-4">建置費用試算 &amp; 募資設定</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-blue-700">店面坪數</label>
            <div className="flex mt-1">
              <input type="number" min="0"
                className="flex-1 border border-blue-200 bg-white rounded-l-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={settings.ping_count}
                onChange={e => setSettings(s => ({ ...s, ping_count: e.target.value }))}
                placeholder="32" />
              <span className="border border-l-0 border-blue-200 rounded-r-xl px-3 py-2 text-sm text-blue-400 bg-white">坪</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-blue-700">每坪單價</label>
            <div className="flex mt-1">
              <span className="border border-r-0 border-blue-200 rounded-l-xl px-3 py-2 text-sm text-blue-400 bg-white">NT$</span>
              <input type="number" min="0"
                className="flex-1 border border-blue-200 bg-white rounded-r-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={settings.price_per_ping}
                onChange={e => setSettings(s => ({ ...s, price_per_ping: e.target.value }))}
                placeholder="75,000" />
            </div>
          </div>
        </div>

        {calculatedCost !== null && (
          <div className="bg-white rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-700">建置總費用試算</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {settings.ping_count} 坪 × NT$ {Number(settings.price_per_ping).toLocaleString()} / 坪
              </p>
            </div>
            <p className="text-xl font-bold text-blue-700">NT$ {calculatedCost.toLocaleString()}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-blue-700">募資總金額</label>
            <p className="text-xs text-gray-400 mb-1">向股東募集的金額</p>
            <div className="flex">
              <span className="border border-r-0 border-blue-200 rounded-l-xl px-3 py-2 text-sm text-blue-400 bg-white">NT$</span>
              <input type="number" min="0"
                className="flex-1 border border-blue-200 bg-white rounded-r-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={settings.total_budget}
                onChange={e => setSettings(s => ({ ...s, total_budget: e.target.value }))}
                placeholder={calculatedCost ? String(calculatedCost) : '2,400,000'} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-blue-700">釋出股份比例</label>
            <p className="text-xs text-gray-400 mb-1">對應募資金額的股份</p>
            <div className="flex">
              <input type="number" step="0.1" min="0" max="100"
                className="flex-1 border border-blue-200 bg-white rounded-l-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={settings.released_pct}
                onChange={e => setSettings(s => ({ ...s, released_pct: e.target.value }))}
                placeholder="30" />
              <span className="border border-l-0 border-blue-200 rounded-r-xl px-3 py-2 text-sm text-blue-400 bg-white">%</span>
            </div>
          </div>
        </div>

        {valuePerPct !== null && (
          <div className="bg-white rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">每 1% 股份對應金額</p>
            <p className="text-sm font-bold text-indigo-700">NT$ {valuePerPct.toLocaleString()}</p>
          </div>
        )}

        <button onClick={saveSettings} disabled={savingSettings}
          className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {savingSettings ? '儲存中...' : '儲存設定'}
        </button>
      </div>

      {/* Budget items */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無預算項目</p>
          <p className="text-sm">新增各項費用預算，追蹤建置成本</p>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map(cat => {
            const catItems = grouped[cat]
            if (catItems.length === 0) return null
            const catTotal = catItems.reduce((s, i) => s + i.estimated_amount, 0)
            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-700 text-sm">{cat}</span>
                  <span className="text-sm text-gray-500">NT$ {catTotal.toLocaleString()}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {catItems.map(item => (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700">NT$ {item.estimated_amount.toLocaleString()}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button onClick={() => startEdit(item)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                          <button onClick={() => deleteItem(item.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between">
            <span className="font-bold text-white">預算明細合計</span>
            <span className="text-xl font-bold text-white">NT$ {total.toLocaleString()}</span>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯預算項目' : '新增預算項目'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">分類</label>
                <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">項目名稱 *</label>
                <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：廚房設備" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">預估金額 *</label>
                <div className="flex mt-1">
                  <span className="border border-r-0 border-gray-200 rounded-l-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50">NT$</span>
                  <input type="number" className="flex-1 border border-gray-200 rounded-r-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.estimated_amount} onChange={e => setForm(f => ({ ...f, estimated_amount: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowAdd(false); setEditId(null) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={save} disabled={!form.name || !form.estimated_amount || saving}
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
