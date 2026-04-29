'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { OpeningChecklistItem } from '@/types'

const DEFAULT_ITEMS = [
  { category: '硬體設備', item: '所有設備到位並測試完成' },
  { category: '硬體設備', item: '水電工程驗收完成' },
  { category: '硬體設備', item: '消防設備檢查完成' },
  { category: '硬體設備', item: '空調系統正常運作' },
  { category: '硬體設備', item: '招牌安裝完成並點燈' },
  { category: '行政法規', item: '營業登記完成' },
  { category: '行政法規', item: '食品業者登錄完成' },
  { category: '行政法規', item: '消防安全檢查合格' },
  { category: '行政法規', item: '建築使用執照取得' },
  { category: '人員準備', item: '所有員工到職並完成訓練' },
  { category: '人員準備', item: 'SOP 說明會完成' },
  { category: '人員準備', item: '制服、識別證備妥' },
  { category: '食材備料', item: '食材供應商確認' },
  { category: '食材備料', item: '初期食材備貨完成' },
  { category: '食材備料', item: '食材保存溫度確認' },
  { category: '行銷宣傳', item: '社群帳號建立完成' },
  { category: '行銷宣傳', item: '開幕優惠方案確定' },
  { category: '行銷宣傳', item: '菜單定稿並印刷完成' },
  { category: '收銀系統', item: '收銀系統安裝測試完成' },
  { category: '收銀系統', item: '零錢備妥' },
  { category: '收銀系統', item: '發票申請/設定完成' },
]

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<OpeningChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ category: '', item: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('opening_checklist').select('*').eq('store_id', id).order('category').order('order_index')
    setItems(data || [])
    setLoading(false)
  }

  async function loadDefaults() {
    const payload = DEFAULT_ITEMS.map((d, i) => ({
      store_id: id, category: d.category, item: d.item,
      completed: false, notes: null, order_index: i
    }))
    await supabase.from('opening_checklist').insert(payload)
    load()
  }

  async function toggle(item: OpeningChecklistItem) {
    await supabase.from('opening_checklist').update({ completed: !item.completed }).eq('id', item.id)
    load()
  }

  async function deleteItem(itemId: string) {
    await supabase.from('opening_checklist').delete().eq('id', itemId)
    load()
  }

  async function addItem() {
    if (!form.item) return
    setSaving(true)
    await supabase.from('opening_checklist').insert({
      store_id: id, category: form.category || '其他', item: form.item,
      completed: false, notes: form.notes || null, order_index: items.length
    })
    setSaving(false)
    setShowAdd(false)
    setForm({ category: '', item: '', notes: '' })
    load()
  }

  const categories = [...new Set(items.map(i => i.category))]
  const done = items.filter(i => i.completed).length
  const total = items.length
  const pct = total > 0 ? Math.round(done / total * 100) : 0

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">開幕確認</h1>
          <p className="text-sm text-gray-400 mt-0.5">{done} / {total} 完成</p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button onClick={loadDefaults}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              載入預設清單
            </button>
          )}
          <button onClick={() => { setShowAdd(true); setForm({ category: '', item: '', notes: '' }) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">開幕準備進度</span>
            <span className="text-sm font-bold text-gray-800">{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="text-sm text-green-600 font-semibold mt-2 text-center">全部完成！可以開幕了！</p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無確認清單</p>
          <p className="text-sm mb-4">可點「載入預設清單」快速建立開幕前確認事項</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map(cat => {
            const catItems = items.filter(i => i.category === cat)
            const catDone = catItems.filter(i => i.completed).length
            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-700 text-sm">{cat}</span>
                  <span className="text-xs text-gray-400">{catDone}/{catItems.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {catItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3 group">
                      <button onClick={() => toggle(item)}
                        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                        {item.completed && <span className="text-white text-xs">✓</span>}
                      </button>
                      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.item}
                      </span>
                      {item.notes && <span className="text-xs text-gray-400">{item.notes}</span>}
                      <button onClick={() => deleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 px-2 py-1 transition-opacity">
                        刪除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-5">新增確認項目</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">分類</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  list="categories-list" placeholder="例：硬體設備" />
                <datalist id="categories-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">確認事項 *</label>
                <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={addItem} disabled={!form.item || saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '儲存中...' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
