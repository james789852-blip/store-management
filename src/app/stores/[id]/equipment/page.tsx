'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Equipment, EquipmentStatus } from '@/types'
import { EQUIPMENT_STATUS_LABEL } from '@/types'
import { EQUIP_BADGE } from '@/lib/colors'

const PRESET_CATEGORIES = ['廚房設備', '冷凍冷藏', '冷暖空調', '排煙設備', 'POS系統', '家具', '其他']

type EquipmentForm = {
  name: string
  category: string
  spec: string
  voltage: string
  width: string
  depth: string
  height: string
  quantity: string
  unit_price: string
  vendor: string
  status: EquipmentStatus
  schedule_task: string
  note: string
}

function emptyForm(): EquipmentForm {
  return {
    name: '',
    category: '',
    spec: '',
    voltage: '',
    width: '',
    depth: '',
    height: '',
    quantity: '1',
    unit_price: '',
    vendor: '',
    status: 'pending',
    schedule_task: '',
    note: '',
  }
}


const inputCls =
  'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function EquipmentPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<EquipmentForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState<'all' | EquipmentStatus>('all')

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase
      .from('equipment')
      .select('*')
      .eq('store_id', id)
      .order('category')
      .order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = {
      store_id: id,
      name: form.name,
      category: form.category || null,
      spec: form.spec || null,
      voltage: form.voltage || null,
      width: form.width ? Number(form.width) : null,
      depth: form.depth ? Number(form.depth) : null,
      height: form.height ? Number(form.height) : null,
      quantity: Number(form.quantity) || 1,
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      vendor: form.vendor || null,
      status: form.status,
      schedule_task: form.schedule_task || null,
      note: form.note || null,
    }
    if (editId) {
      await supabase.from('equipment').update(payload).eq('id', editId)
    } else {
      await supabase.from('equipment').insert(payload)
    }
    setSaving(false)
    closeModal()
    load()
  }

  async function confirmDelete() {
    if (!deleteId) return
    await supabase.from('equipment').delete().eq('id', deleteId)
    setDeleteId(null)
    load()
  }

  function closeModal() {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm())
  }

  function startEdit(item: Equipment) {
    setForm({
      name: item.name,
      category: item.category || '',
      spec: item.spec || '',
      voltage: item.voltage || '',
      width: item.width !== null ? String(item.width) : '',
      depth: item.depth !== null ? String(item.depth) : '',
      height: item.height !== null ? String(item.height) : '',
      quantity: String(item.quantity),
      unit_price: item.unit_price !== null ? String(item.unit_price) : '',
      vendor: item.vendor || '',
      status: item.status,
      schedule_task: item.schedule_task || '',
      note: item.note || '',
    })
    setEditId(item.id)
    setShowModal(true)
  }

  async function exportExcel() {
    const { utils, writeFile } = await import('xlsx')
    const rows = filtered.map(e => ({
      設備名稱: e.name,
      類別: e.category || '',
      規格: e.spec || '',
      電壓: e.voltage || '',
      寬度W: e.width ?? '',
      深度D: e.depth ?? '',
      高度H: e.height ?? '',
      數量: e.quantity,
      單價: e.unit_price ?? '',
      小計: e.unit_price ? e.unit_price * e.quantity : '',
      廠商: e.vendor || '',
      狀態: EQUIPMENT_STATUS_LABEL[e.status],
      排程任務: e.schedule_task || '',
      備註: e.note || '',
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '設備清單')
    writeFile(wb, `設備清單_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // derived categories from data
  const categories = useMemo(() => {
    const fromData = Array.from(new Set(items.map(i => i.category).filter(Boolean) as string[]))
    const merged = Array.from(new Set([...PRESET_CATEGORIES, ...fromData]))
    return ['全部', ...merged]
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(item => {
      const catOk = categoryFilter === '全部' || item.category === categoryFilter
      const statusOk = statusFilter === 'all' || item.status === statusFilter
      return catOk && statusOk
    })
  }, [items, categoryFilter, statusFilter])

  const totalValue = items.reduce((s, i) => s + (i.unit_price ?? 0) * i.quantity, 0)
  const filteredValue = filtered.reduce((s, i) => s + (i.unit_price ?? 0) * i.quantity, 0)

  const statusCounts = useMemo(() => {
    const counts: Record<EquipmentStatus, number> = { installed: 0, ordered: 0, pending: 0 }
    items.forEach(i => { counts[i.status]++ })
    return counts
  }, [items])

  function dimStr(item: Equipment) {
    if (item.width || item.depth || item.height) {
      return `${item.width ?? '—'}×${item.depth ?? '—'}×${item.height ?? '—'}`
    }
    return '—'
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設備清單</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-sm text-gray-500">共 <span className="font-semibold text-gray-700">{items.length}</span> 項</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">設備總值 <span className="font-semibold text-gray-700">NT$ {totalValue.toLocaleString()}</span></span>
            <span className="text-gray-300">|</span>
            {(Object.entries(EQUIPMENT_STATUS_LABEL) as [EquipmentStatus, string][]).map(([key, label]) => (
              <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${EQUIP_BADGE[key]}`}>
                {label} {statusCounts[key]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {items.length > 0 && (
            <button onClick={exportExcel}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              匯出 Excel
            </button>
          )}
          <button
            onClick={() => { closeModal(); setShowModal(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增設備
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {cat}
            </button>
          ))}
        </div>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="ml-auto border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="all">全部狀態</option>
          {(Object.entries(EQUIPMENT_STATUS_LABEL) as [EquipmentStatus, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <p className="text-lg font-medium text-gray-600 mb-1">
            {items.length === 0 ? '尚無設備資料' : '沒有符合條件的設備'}
          </p>
          <p className="text-sm">{items.length === 0 ? '點擊「新增設備」開始建立設備清單' : '請調整篩選條件'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['設備名稱', '類別', '規格 / 電壓', '尺寸 (W×D×H cm)', '數量', '單價', '廠商', '狀態', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.id} className="group hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>{item.spec || '—'}</div>
                      {item.voltage && <div className="text-xs text-gray-400">{item.voltage}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{dimStr(item)}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {item.unit_price !== null ? (
                        <>
                          <div>NT$ {item.unit_price.toLocaleString()}</div>
                          {item.quantity > 1 && (
                            <div className="text-xs text-gray-400">小計 {(item.unit_price * item.quantity).toLocaleString()}</div>
                          )}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.vendor || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EQUIP_BADGE[item.status]}`}>
                        {EQUIPMENT_STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button onClick={() => startEdit(item)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                        <button onClick={() => setDeleteId(item.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                    小計 {filtered.length} 項
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-center">
                    {filtered.reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                    NT$ {filteredValue.toLocaleString()}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯設備' : '新增設備'}</h2>
            <div className="space-y-3">
              {/* 名稱 + 類別 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-gray-700">設備名稱 *</label>
                  <input autoFocus className={inputCls}
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：雙層蒸籠" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">類別</label>
                  <input className={inputCls} list="category-list"
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="選擇或輸入類別" />
                  <datalist id="category-list">
                    {PRESET_CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* 規格 + 電壓 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">規格</label>
                  <input className={inputCls}
                    value={form.spec} onChange={e => setForm(f => ({ ...f, spec: e.target.value }))}
                    placeholder="例：瓦斯型 / 三門" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">電壓</label>
                  <input className={inputCls}
                    value={form.voltage} onChange={e => setForm(f => ({ ...f, voltage: e.target.value }))}
                    placeholder="例：220V 30A" />
                </div>
              </div>

              {/* 尺寸 W × D × H */}
              <div>
                <label className="text-sm font-medium text-gray-700">尺寸 (cm)</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className="relative">
                    <input type="number" className={inputCls + ' !mt-0 pr-8'}
                      value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))}
                      placeholder="寬 W" />
                  </div>
                  <div className="relative">
                    <input type="number" className={inputCls + ' !mt-0'}
                      value={form.depth} onChange={e => setForm(f => ({ ...f, depth: e.target.value }))}
                      placeholder="深 D" />
                  </div>
                  <div className="relative">
                    <input type="number" className={inputCls + ' !mt-0'}
                      value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                      placeholder="高 H" />
                  </div>
                </div>
              </div>

              {/* 數量 + 單價 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">數量</label>
                  <input type="number" min="1" className={inputCls}
                    value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">單價 (NT$)</label>
                  <input type="number" className={inputCls}
                    value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                    placeholder="0" />
                </div>
              </div>

              {/* 廠商 + 狀態 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">廠商</label>
                  <input className={inputCls}
                    value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">狀態</label>
                  <select className={inputCls}
                    value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EquipmentStatus }))}>
                    {(Object.entries(EQUIPMENT_STATUS_LABEL) as [EquipmentStatus, string][]).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 備註 */}
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <input className={inputCls}
                  value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>

            {/* 小計預覽 */}
            {form.unit_price && form.quantity && (
              <div className="mt-3 text-right text-sm text-gray-500">
                小計：<span className="font-semibold text-gray-800">
                  NT$ {(Number(form.unit_price) * Number(form.quantity)).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button onClick={closeModal}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={save} disabled={!form.name || saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-2">確認刪除</h2>
            <p className="text-sm text-gray-500 mb-6">
              確定要刪除「{items.find(i => i.id === deleteId)?.name}」嗎？此操作無法復原。
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors">
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
