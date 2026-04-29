'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { BudgetItem } from '@/types'

const CATEGORIES = ['裝潢工程', '設備採購', '家具軟裝', '招牌廣告', '行政費用', '備用金', '其他']

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: CATEGORIES[0], name: '', estimated_amount: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('budget_items').select('*').eq('store_id', id).order('category').order('order_index')
    setItems(data || [])
    setLoading(false)
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
    setForm({ category: CATEGORIES[0], name: '', estimated_amount: '', notes: '' })
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">預算規劃</h1>
          <p className="text-sm text-gray-400 mt-0.5">總預算：NT$ {total.toLocaleString()}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ category: CATEGORIES[0], name: '', estimated_amount: '', notes: '' }) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + 新增項目
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無預算項目</p>
          <p className="text-sm">新增各項費用預算，追蹤建置成本</p>
        </div>
      ) : (
        <div className="space-y-6">
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
            <span className="font-bold text-white">總預算合計</span>
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
                <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.estimated_amount} onChange={e => setForm(f => ({ ...f, estimated_amount: e.target.value }))} placeholder="0" />
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
