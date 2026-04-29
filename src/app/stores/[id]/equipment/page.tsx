'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Equipment } from '@/types'

const CATEGORIES = ['廚房設備', '冷藏冷凍', '外場設備', '收銀設備', '辦公設備', '其他']

function emptyForm() {
  return {
    category: CATEGORIES[0], name: '', brand: '', model: '', size: '', power: '',
    condition: '全新' as const, quantity: '1', price: '', warranty_expire: '', arrival_date: '', notes: ''
  }
}

export default function EquipmentPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('equipment').select('*').eq('store_id', id).order('category').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = {
      store_id: id,
      category: form.category || null,
      name: form.name,
      brand: form.brand || null,
      model: form.model || null,
      size: form.size || null,
      power: form.power || null,
      condition: form.condition,
      quantity: Number(form.quantity) || 1,
      price: form.price ? Number(form.price) : null,
      warranty_expire: form.warranty_expire || null,
      arrival_date: form.arrival_date || null,
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('equipment').update(payload).eq('id', editId)
    } else {
      await supabase.from('equipment').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm())
    load()
  }

  async function deleteItem(itemId: string) {
    await supabase.from('equipment').delete().eq('id', itemId)
    load()
  }

  async function exportExcel() {
    const { utils, writeFile } = await import('xlsx')
    const rows = items.map(e => ({
      分類: e.category || '',
      名稱: e.name,
      品牌: e.brand || '',
      型號: e.model || '',
      尺寸: e.size || '',
      電力: e.power || '',
      新舊: e.condition,
      數量: e.quantity,
      單價: e.price || '',
      保固到期: e.warranty_expire || '',
      到貨日: e.arrival_date || '',
      備註: e.notes || '',
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '設備清單')
    writeFile(wb, `設備清單_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function startEdit(item: Equipment) {
    setForm({
      category: item.category || CATEGORIES[0],
      name: item.name,
      brand: item.brand || '',
      model: item.model || '',
      size: item.size || '',
      power: item.power || '',
      condition: item.condition,
      quantity: String(item.quantity),
      price: item.price !== null ? String(item.price) : '',
      warranty_expire: item.warranty_expire || '',
      arrival_date: item.arrival_date || '',
      notes: item.notes || '',
    })
    setEditId(item.id)
    setShowAdd(true)
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat)
    return acc
  }, {} as Record<string, Equipment[]>)

  const totalValue = items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0)

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設備清單</h1>
          <p className="text-sm text-gray-400 mt-0.5">共 {items.length} 項｜設備總值 NT$ {totalValue.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button onClick={exportExcel}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              匯出 Excel
            </button>
          )}
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm()) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增設備
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無設備資料</p>
          <p className="text-sm">建立設備清單，可匯出 Excel</p>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const catItems = grouped[cat]
            if (catItems.length === 0) return null
            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="font-semibold text-gray-700 text-sm">{cat}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-50">
                      <tr>
                        {['名稱', '品牌/型號', '尺寸', '電力', '新舊', '數量', '單價', '保固到期', ''].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {catItems.map(item => (
                        <tr key={item.id} className="group hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                          <td className="px-4 py-3 text-gray-500">{[item.brand, item.model].filter(Boolean).join(' ') || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{item.size || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{item.power || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.condition === '全新' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                              {item.condition}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-gray-600">{item.price ? `NT$ ${item.price.toLocaleString()}` : '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{item.warranty_expire || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              <button onClick={() => startEdit(item)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                              <button onClick={() => deleteItem(item.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯設備' : '新增設備'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">分類</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">設備名稱 *</label>
                  <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">品牌</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">型號</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">尺寸</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="例：W60 x D70 x H85" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">電力規格</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.power} onChange={e => setForm(f => ({ ...f, power: e.target.value }))} placeholder="例：110V / 220V" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">新舊</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value as typeof form.condition }))}>
                    <option value="全新">全新</option>
                    <option value="二手">二手</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">數量</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">單價</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">保固到期日</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.warranty_expire} onChange={e => setForm(f => ({ ...f, warranty_expire: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">到貨日</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.arrival_date} onChange={e => setForm(f => ({ ...f, arrival_date: e.target.value }))} />
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
              <button onClick={save} disabled={!form.name || saving}
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
