'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Equipment, EquipmentStatus } from '@/types'
import { EQUIPMENT_STATUS_LABEL } from '@/types'
import { EQUIP_BADGE } from '@/lib/colors'
import FileUploader from '@/components/FileUploader'

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
  condition: string
  schedule_task: string
  photos: string[]
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
    condition: '',
    schedule_task: '',
    photos: [],
    note: '',
  }
}


const inputCls =
  'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent'

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
  const [lightbox, setLightbox] = useState<{ name: string; photos: string[]; idx: number } | null>(null)

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
      condition: form.condition || null,
      schedule_task: form.schedule_task || null,
      photos: form.photos,
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
      condition: item.condition || '',
      schedule_task: item.schedule_task || '',
      photos: item.photos || [],
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
      新舊: e.condition || '',
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
  const noPriceCount = items.filter(i => i.unit_price == null).length

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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">設備清單</h1>
          <p className="text-sm text-gray-400 mt-0.5">共 {items.length} 項設備</p>
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
            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
            + 新增設備
          </button>
        </div>
      </div>

      {/* KPI summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="lp-card p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">設備總值</p>
            <p className="text-xl font-bold text-gray-900 truncate">NT$ {totalValue.toLocaleString()}</p>
            <p className="text-[11px] text-gray-400 mt-1.5 truncate">{items.length} 項{noPriceCount > 0 ? ` · ${noPriceCount} 項未填價格` : ''}</p>
          </div>
          <div className="lp-card p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">已安裝</p>
            <p className="text-xl font-bold text-brand-teal truncate">{statusCounts.installed}<span className="text-sm font-semibold"> 項</span></p>
          </div>
          <div className="lp-card p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">已訂購</p>
            <p className="text-xl font-bold text-brand-blue truncate">{statusCounts.ordered}<span className="text-sm font-semibold"> 項</span></p>
          </div>
          <div className="lp-card p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">待確認</p>
            <p className="text-xl font-bold text-accent truncate">{statusCounts.pending}<span className="text-sm font-semibold"> 項</span></p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                categoryFilter === cat
                  ? 'bg-gray-900 text-white font-medium'
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
          className="ml-auto border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white">
          <option value="all">全部狀態</option>
          {(Object.entries(EQUIPMENT_STATUS_LABEL) as [EquipmentStatus, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          {items.length === 0 ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-tint flex items-center justify-center text-accent">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4z M4 10h16 M9 5v5" /></svg>
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-1">還沒有設備</p>
              <p className="text-sm text-gray-400">把廚房、冷藏、POS 等設備建進來，規格、尺寸、價格一次管好</p>
            </>
          ) : (
            <p className="text-base font-medium text-gray-500">沒有符合條件的設備</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['照片', '設備名稱', '類別', '新舊', '規格 / 電壓', '尺寸 (W×D×H cm)', '數量', '單價', '廠商', '狀態', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.id} className="group hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {item.photos?.length > 0 ? (
                        <div className="relative w-10 h-10 cursor-pointer"
                          onClick={() => setLightbox({ name: item.name, photos: item.photos, idx: 0 })}>
                          <img src={item.photos[0]} alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-100 hover:opacity-80 transition-opacity" />
                          {item.photos.length > 1 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                              {item.photos.length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">無</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.category || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.condition ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.condition === '全新' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {item.condition}
                        </span>
                      ) : '—'}
                    </td>
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
                      <div className="flex gap-1 transition-opacity">
                        <button onClick={() => startEdit(item)} className="text-xs text-accent hover:text-accent px-2 py-1">編輯</button>
                        <button onClick={() => setDeleteId(item.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-gray-700">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯設備' : '新增設備'}</h2>
            <div className="space-y-3">
              {/* 名稱 + 類別 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-gray-700">設備名稱 *</label>
                  <input autoFocus className={inputCls}
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：雙層蒸籠" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">類別</label>
                  <select className={inputCls}
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">請選擇類別</option>
                    {PRESET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* 規格 + 電壓 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* 新舊 */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">新舊狀態</label>
                <div className="flex gap-2">
                  {['全新', '二手'].map(opt => (
                    <button key={opt} type="button"
                      onClick={() => setForm(f => ({ ...f, condition: f.condition === opt ? '' : opt }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        form.condition === opt
                          ? opt === '全新'
                            ? 'bg-green-50 border-green-400 text-green-700'
                            : 'bg-amber-50 border-amber-400 text-amber-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 備註 */}
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <input className={inputCls}
                  value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              {/* 照片 */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">照片</label>
                <FileUploader
                  folderPath={`equipment/${id}`}
                  value={form.photos}
                  onChange={photos => setForm(f => ({ ...f, photos }))}
                  multiple
                  accept="image/*"
                />
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
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
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

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50"
          onClick={() => setLightbox(null)}>
          {/* 標題列 */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            <span className="text-white font-medium text-sm">{lightbox.name}</span>
            <div className="flex items-center gap-3">
              {lightbox.photos.length > 1 && (
                <span className="text-white/70 text-xs">{lightbox.idx + 1} / {lightbox.photos.length}</span>
              )}
              <button onClick={() => setLightbox(null)}
                className="text-white/80 hover:text-white text-2xl leading-none">✕</button>
            </div>
          </div>

          {/* 主圖 */}
          <img
            src={lightbox.photos[lightbox.idx]}
            alt={lightbox.name}
            className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
            onClick={e => e.stopPropagation()}
          />

          {/* 左右箭頭 */}
          {lightbox.photos.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-xl transition-colors"
                onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, idx: (l.idx - 1 + l.photos.length) % l.photos.length } : null) }}>
                ‹
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-xl transition-colors"
                onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, idx: (l.idx + 1) % l.photos.length } : null) }}>
                ›
              </button>
            </>
          )}

          {/* 縮圖列（多張時顯示） */}
          {lightbox.photos.length > 1 && (
            <div className="absolute bottom-4 flex gap-2 px-4 overflow-x-auto max-w-full"
              onClick={e => e.stopPropagation()}>
              {lightbox.photos.map((url, i) => (
                <img key={i} src={url} alt=""
                  className={`w-12 h-12 object-cover rounded-lg cursor-pointer border-2 transition-all flex-shrink-0 ${i === lightbox.idx ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
                  onClick={() => setLightbox(l => l ? { ...l, idx: i } : null)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
