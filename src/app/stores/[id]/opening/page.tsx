'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { OpeningChecklistItem, GovApplication } from '@/types'

// '證照與行政' is protected — always first, tied to gov_applications display
const GOV_CAT = '證照與行政'
const DEFAULT_CATEGORIES = [GOV_CAT, '工程驗收', '設備與系統', '人員準備', '備品與食材', '行銷與品牌']

const DEFAULT_ITEMS: Omit<OpeningChecklistItem, 'id' | 'store_id' | 'created_at' | 'updated_at'>[] = [
  { category: '工程驗收', name: '全部工程完工', description: '確認所有工項驗收完畢', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 10 },
  { category: '工程驗收', name: '水電驗收', description: '水電、弱電系統測試', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 11 },
  { category: '工程驗收', name: '廚房設備安裝完成', description: '所有廚房設備就位並測試', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 12 },
  { category: '工程驗收', name: '招牌安裝完成', description: '招牌與燈箱安裝驗收', tags: [], is_required: false, done: false, note: null, sort_order: 13 },
  { category: '工程驗收', name: '監視系統測試', description: '監視器畫面確認', tags: [], is_required: false, done: false, note: null, sort_order: 14 },
  { category: '工程驗收', name: '全店清潔完成', description: '開幕前大掃除', tags: [], is_required: false, done: false, note: null, sort_order: 15 },
  { category: '設備與系統', name: 'POS 系統設定', description: '菜單、印表機、金流設定完成', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 20 },
  { category: '設備與系統', name: '電子發票機申請', description: '發票機申請核准並測試', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 21 },
  { category: '設備與系統', name: 'Wi-Fi 網路設定', description: '門市網路正常運作', tags: [], is_required: false, done: false, note: null, sort_order: 22 },
  { category: '設備與系統', name: '冷藏冷凍設備測試', description: '溫度達標確認', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 23 },
  { category: '設備與系統', name: '外送平台上架', description: 'foodpanda / Uber Eats 上架', tags: [], is_required: false, done: false, note: null, sort_order: 24 },
  { category: '人員準備', name: '店長到位', description: '店長確認報到', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 30 },
  { category: '人員準備', name: '員工招募完成', description: '開幕所需人員齊全', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 31 },
  { category: '人員準備', name: '教育訓練完成', description: '員工完成產品與服務訓練', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 32 },
  { category: '人員準備', name: '試營運演練', description: '至少一次完整試營運', tags: [], is_required: false, done: false, note: null, sort_order: 33 },
  { category: '備品與食材', name: '備品採購完成', description: '衛生用品、包裝材料就緒', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 40 },
  { category: '備品與食材', name: '供應商確認', description: '食材供應商簽約並首次進貨', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 41 },
  { category: '備品與食材', name: '首日備貨完成', description: '開幕日食材備妥', tags: ['必要'], is_required: true, done: false, note: null, sort_order: 42 },
  { category: '備品與食材', name: '清潔用品備齊', description: '清潔劑、拖把、手套等', tags: [], is_required: false, done: false, note: null, sort_order: 43 },
  { category: '行銷與品牌', name: 'Google Maps 上架', description: '商家資料設定完成', tags: [], is_required: false, done: false, note: null, sort_order: 50 },
  { category: '行銷與品牌', name: '社群媒體建立', description: 'IG / Facebook 粉專開立', tags: [], is_required: false, done: false, note: null, sort_order: 51 },
  { category: '行銷與品牌', name: '開幕活動規劃', description: '開幕促銷或活動確認', tags: [], is_required: false, done: false, note: null, sort_order: 52 },
  { category: '行銷與品牌', name: '菜單設計定稿', description: '菜單印製完成', tags: [], is_required: false, done: false, note: null, sort_order: 53 },
]

// Cycle through palette for dynamic categories
const CAT_PALETTE = [
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-green-100 text-green-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

function catColor(categories: string[], cat: string) {
  const idx = categories.indexOf(cat)
  return CAT_PALETTE[idx % CAT_PALETTE.length] ?? 'bg-gray-100 text-gray-600'
}

type ItemForm = { name: string; description: string; category: string; is_required: boolean }
const emptyItemForm = (cat = '工程驗收'): ItemForm => ({ name: '', description: '', category: cat, is_required: false })

const CONFIG_NAME = '__category_config__'

export default function OpeningPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<OpeningChecklistItem[]>([])
  const [govApps, setGovApps] = useState<Pick<GovApplication, 'status'>[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [noteEditing, setNoteEditing] = useState<string | null>(null)
  const [noteVal, setNoteVal] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  // Categories (dynamic)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [catConfigId, setCatConfigId] = useState<string | null>(null)

  // Category management modal
  const [showCatModal, setShowCatModal] = useState(false)
  const [catDraft, setCatDraft] = useState<string[]>([])
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [newCatVal, setNewCatVal] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  // Item add/edit modal
  const [showItemModal, setShowItemModal] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm())
  const [savingItem, setSavingItem] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)

  const isComposing = useRef(false)

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const [{ data: list, error: listError }, { data: gov }] = await Promise.all([
      supabase.from('opening_checklist').select('*').eq('store_id', id).order('sort_order'),
      supabase.from('gov_applications').select('status').eq('store_id', id),
    ])
    setGovApps(gov || [])

    if (listError) {
      setLoading(false)
      return
    }

    const allRows = list || []
    const configRow = allRows.find(r => r.name === CONFIG_NAME)
    const realItems = allRows.filter(r => r.name !== CONFIG_NAME)

    // Load categories from config row
    if (configRow) {
      setCatConfigId(configRow.id)
      try {
        const parsed = JSON.parse(configRow.description ?? '[]')
        if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed)
      } catch {}
    }

    if (realItems.length === 0) {
      const toInsert = DEFAULT_ITEMS.map(item => ({ ...item, store_id: id }))
      const { data: inserted } = await supabase.from('opening_checklist').insert(toInsert).select()
      setItems((inserted || []).filter(r => r.name !== CONFIG_NAME))
    } else {
      setItems(realItems)
    }
    setLoading(false)
  }

  async function saveCategoryConfig(cats: string[]) {
    const payload = {
      store_id: id,
      name: CONFIG_NAME,
      description: JSON.stringify(cats),
      category: '__config__',
      tags: [] as string[],
      is_required: false,
      done: false,
      note: null,
      sort_order: -999,
    }
    if (catConfigId) {
      await supabase.from('opening_checklist').update(payload).eq('id', catConfigId)
    } else {
      const { data } = await supabase.from('opening_checklist').insert(payload).select().single()
      if (data) setCatConfigId(data.id)
    }
    setCategories(cats)
  }

  // ── Category modal ──────────────────────────────────────────────────────
  function openCatModal() {
    setCatDraft([...categories])
    setRenamingIdx(null)
    setNewCatVal('')
    setShowCatModal(true)
  }

  function moveCat(idx: number, dir: -1 | 1) {
    const next = [...catDraft]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    // Don't move GOV_CAT away from first position
    if (next[idx] === GOV_CAT || next[target] === GOV_CAT) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setCatDraft(next)
  }

  function addCat() {
    const name = newCatVal.trim()
    if (!name || catDraft.includes(name)) return
    setCatDraft(d => [...d, name])
    setNewCatVal('')
  }

  function startRename(idx: number) {
    if (catDraft[idx] === GOV_CAT) return
    setRenamingIdx(idx)
    setRenameVal(catDraft[idx])
  }

  function commitRename() {
    const name = renameVal.trim()
    if (!name || renamingIdx === null) { setRenamingIdx(null); return }
    if (name !== catDraft[renamingIdx] && catDraft.includes(name)) { setRenamingIdx(null); return }
    setCatDraft(d => d.map((c, i) => i === renamingIdx ? name : c))
    setRenamingIdx(null)
  }

  function removeCat(idx: number) {
    if (catDraft[idx] === GOV_CAT) return
    setCatDraft(d => d.filter((_, i) => i !== idx))
  }

  async function applyCategories() {
    setSavingCat(true)
    // Find renamed categories (by comparing positions with original)
    const renames: { from: string; to: string }[] = []
    catDraft.forEach((newName, i) => {
      const oldName = categories[i]
      if (oldName && oldName !== newName && oldName !== GOV_CAT) {
        renames.push({ from: oldName, to: newName })
      }
    })
    // Apply renames to items in DB
    for (const { from, to } of renames) {
      await supabase.from('opening_checklist')
        .update({ category: to })
        .eq('store_id', id)
        .eq('category', from)
    }
    await saveCategoryConfig(catDraft)
    // Refresh items state with renamed categories
    if (renames.length > 0) {
      setItems(prev => prev.map(item => {
        const r = renames.find(r => r.from === item.category)
        return r ? { ...item, category: r.to } : item
      }))
    }
    setSavingCat(false)
    setShowCatModal(false)
  }

  // ── Item CRUD ───────────────────────────────────────────────────────────
  async function toggle(item: OpeningChecklistItem) {
    const newDone = !item.done
    await supabase.from('opening_checklist').update({ done: newDone }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: newDone } : i))
  }

  async function saveNote(item: OpeningChecklistItem) {
    await supabase.from('opening_checklist').update({ note: noteVal || null }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, note: noteVal || null } : i))
    setNoteEditing(null)
  }

  function openAddItem(defaultCat?: string) {
    setItemForm(emptyItemForm(defaultCat || categories.find(c => c !== GOV_CAT) || '工程驗收'))
    setEditItemId(null)
    setShowItemModal(true)
  }

  function openEditItem(item: OpeningChecklistItem) {
    setItemForm({
      name: item.name,
      description: item.description || '',
      category: item.category || categories[1] || '工程驗收',
      is_required: item.is_required,
    })
    setEditItemId(item.id)
    setShowItemModal(true)
  }

  async function saveItem() {
    if (!itemForm.name) return
    setSavingItem(true)
    const payload = {
      store_id: id,
      name: itemForm.name,
      description: itemForm.description || null,
      category: itemForm.category,
      is_required: itemForm.is_required,
      tags: itemForm.is_required ? ['必要'] : [],
      done: false,
      note: null,
      sort_order: editItemId
        ? items.find(i => i.id === editItemId)?.sort_order ?? 99
        : Math.max(0, ...items.map(i => i.sort_order)) + 1,
    }
    const targetCategory = itemForm.category
    if (editItemId) {
      const { error } = await supabase.from('opening_checklist').update(payload).eq('id', editItemId)
      if (error) {
        setSavingItem(false)
        alert('儲存失敗：' + error.message)
        return
      }
      setItems(prev => prev.map(i => i.id === editItemId ? { ...i, ...payload } : i))
    } else {
      const { data: newItem, error } = await supabase
        .from('opening_checklist')
        .insert(payload)
        .select()
        .single()
      if (error || !newItem) {
        setSavingItem(false)
        alert(error ? '新增失敗：' + error.message : '新增失敗，請再試一次')
        return
      }
      setItems(prev => [...prev, newItem])
      setCollapsed(c => ({ ...c, [targetCategory]: false }))
    }
    setSavingItem(false)
    setShowItemModal(false)
    setEditItemId(null)
  }

  async function confirmDeleteItem() {
    if (!deleteItemId) return
    await supabase.from('opening_checklist').delete().eq('id', deleteItemId)
    setDeleteItemId(null)
    load()
  }

  // ── Stats ───────────────────────────────────────────────────────────────
  const govDone = govApps.filter(g => g.status === 'done').length
  const govTotal = govApps.length
  const govPct = govTotal > 0 ? Math.round(govDone / govTotal * 100) : 0
  const nonGovItems = items.filter(i => i.category !== GOV_CAT)
  const totalItems = nonGovItems.length
  const doneItems = nonGovItems.filter(i => i.done).length
  const requiredItems = nonGovItems.filter(i => i.is_required && !i.done).length
  const govComplete = govTotal > 0 && govDone === govTotal
  const allDone = doneItems === totalItems && govComplete
  const overallPct = totalItems > 0
    ? Math.round(((doneItems + (govComplete ? 1 : 0)) / (totalItems + 1)) * 100)
    : 0

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">開幕確認</h1>
            <div className="flex gap-2">
              <button
                onClick={openCatModal}
                className="border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                管理分類
              </button>
              <button
                onClick={() => openAddItem()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                + 新增項目
              </button>
            </div>
          </div>

          {/* Progress card */}
          <div className={`rounded-2xl p-5 text-white mb-4 ${allDone ? 'bg-gradient-to-r from-teal-500 to-green-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/80 text-sm">整體準備進度</p>
                <p className="text-3xl font-bold">{overallPct}%</p>
              </div>
              <div className="text-right text-sm text-white/80">
                <p>{doneItems} / {totalItems} 項完成</p>
                {govTotal > 0 && <p>政府申請 {govPct}%</p>}
              </div>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          {!allDone && requiredItems > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-3">
              ⚠️ 還有 <strong>{requiredItems}</strong> 項必要項目未完成
            </div>
          )}
          {allDone && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700 mb-3">
              🎉 所有項目已確認！可以準備開幕了
            </div>
          )}

          <button
            disabled={!allDone}
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500"
          >
            確認開幕 🎊
          </button>
        </div>

        {/* Checklist by category */}
        <div className="space-y-4">
          {categories.map(cat => {
            const isGov = cat === GOV_CAT
            const catItems = items.filter(i => i.category === cat)
            const catDone = isGov ? (govComplete ? 1 : 0) : catItems.filter(i => i.done).length
            const catTotal = isGov ? 1 : catItems.length
            const isCollapsed = collapsed[cat]
            const color = catColor(categories, cat)

            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <button
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                    onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${color}`}>{cat}</span>
                    <span className="text-sm text-gray-500 flex-shrink-0">{catDone}/{catTotal}</span>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${catTotal > 0 ? (catDone / catTotal) * 100 : 0}%` }} />
                    </div>
                    <span className="text-gray-400 text-sm ml-auto flex-shrink-0">{isCollapsed ? '▼' : '▲'}</span>
                  </button>
                  {!isGov && (
                    <button
                      onClick={() => openAddItem(cat)}
                      className="ml-3 text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                    >
                      + 新增
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div>
                    {isGov ? (
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-gray-600">政府申請完成率</p>
                          <Link href={`/stores/${id}/gov`} className="text-xs text-blue-600 hover:underline">前往政府申請 →</Link>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${govPct}%` }} />
                        </div>
                        <p className="text-sm text-gray-500">{govDone} / {govTotal} 項完成（{govPct}%）</p>
                        {govTotal === 0 && <p className="text-sm text-gray-400 mt-1">尚未新增政府申請項目</p>}
                      </div>
                    ) : catItems.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">
                        此分類尚無項目
                        <button onClick={() => openAddItem(cat)} className="block mx-auto mt-2 text-blue-500 hover:underline text-xs">+ 新增第一個項目</button>
                      </div>
                    ) : (
                      <ul>
                        {catItems.map((item, idx) => (
                          <li key={item.id} className={`px-5 py-3 flex items-start gap-3 ${idx > 0 ? 'border-t border-gray-50' : ''} hover:bg-gray-50 group`}>
                            <button onClick={() => toggle(item)} className="mt-0.5 flex-shrink-0">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${item.done ? 'bg-teal-500 border-teal-500' : 'border-gray-300 hover:border-teal-400'}`}>
                                {item.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-medium ${item.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.name}</span>
                                {item.is_required && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">必要</span>}
                              </div>
                              {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                              {noteEditing === item.id ? (
                                <div className="mt-2 flex gap-2">
                                  <input
                                    autoFocus
                                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={noteVal}
                                    onChange={e => setNoteVal(e.target.value)}
                                    onCompositionStart={() => { isComposing.current = true }}
                                    onCompositionEnd={() => { isComposing.current = false }}
                                    onKeyDown={e => { if (e.key === 'Enter' && !isComposing.current) saveNote(item) }}
                                    placeholder="備註..."
                                  />
                                  <button onClick={() => saveNote(item)} className="text-xs text-blue-600 hover:underline">存</button>
                                  <button onClick={() => setNoteEditing(null)} className="text-xs text-gray-400 hover:underline">取消</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setNoteEditing(item.id); setNoteVal(item.note || '') }}
                                  className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                                >
                                  {item.note ? `📝 ${item.note}` : '+ 備註'}
                                </button>
                              )}
                            </div>
                            <div className="flex gap-1 transition-opacity flex-shrink-0">
                              <button onClick={() => openEditItem(item)} className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-1">編輯</button>
                              <button onClick={() => setDeleteItemId(item.id)} className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1">刪除</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Category Management Modal ─────────────────────────────────── */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">管理分類</h2>
              <p className="text-sm text-gray-400 mt-0.5">可新增、重新命名、排序或刪除分類</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
              {catDraft.map((cat, idx) => {
                const isGov = cat === GOV_CAT
                const itemCount = items.filter(i => i.category === cat).length
                const isRenaming = renamingIdx === idx

                return (
                  <div key={idx} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isGov ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300'} transition-colors`}>
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveCat(idx, -1)}
                        disabled={isGov || idx <= 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none px-0.5"
                      >▲</button>
                      <button
                        onClick={() => moveCat(idx, 1)}
                        disabled={isGov || idx === catDraft.length - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none px-0.5"
                      >▼</button>
                    </div>

                    {/* Name / rename input */}
                    {isRenaming ? (
                      <input
                        autoFocus
                        className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') setRenamingIdx(null)
                        }}
                        onBlur={commitRename}
                      />
                    ) : (
                      <span className={`flex-1 text-sm font-medium ${isGov ? 'text-gray-400' : 'text-gray-800'}`}>
                        {cat}
                        {isGov && <span className="ml-1.5 text-[10px] text-gray-400">（系統固定）</span>}
                      </span>
                    )}

                    {/* Item count */}
                    {!isGov && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{itemCount} 項</span>
                    )}

                    {/* Actions */}
                    {!isGov && !isRenaming && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startRename(idx)}
                          className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-1 rounded hover:bg-blue-50"
                        >
                          改名
                        </button>
                        <button
                          onClick={() => removeCat(idx)}
                          disabled={itemCount > 0}
                          title={itemCount > 0 ? '請先刪除分類內的所有項目' : ''}
                          className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          刪除
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add new category */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="新分類名稱..."
                  value={newCatVal}
                  onChange={e => setNewCatVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCat() }}
                />
                <button
                  onClick={addCat}
                  disabled={!newCatVal.trim() || catDraft.includes(newCatVal.trim())}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  新增
                </button>
              </div>
            </div>

            <div className="flex gap-2 px-6 pb-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCatModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button
                onClick={applyCategories}
                disabled={savingCat}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingCat ? '儲存中...' : '套用'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Item Modal ───────────────────────────────────────── */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{editItemId ? '編輯項目' : '新增項目'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">項目名稱 *</label>
                <input
                  autoFocus
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={itemForm.name}
                  onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：試營運演練"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">說明</label>
                <textarea
                  rows={4}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={itemForm.description}
                  onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="補充說明或注意事項"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">分類</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={itemForm.category}
                  onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                >
                  {categories.filter(c => c !== GOV_CAT).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={itemForm.is_required}
                  onChange={e => setItemForm(f => ({ ...f, is_required: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">設為必要項目</span>
                <span className="text-xs text-red-500">（未完成時無法開幕）</span>
              </label>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setShowItemModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button
                onClick={saveItem}
                disabled={!itemForm.name || savingItem}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingItem ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Item Confirm ───────────────────────────────────────── */}
      {deleteItemId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 mb-2">確認刪除</h2>
            <p className="text-sm text-gray-500 mb-5">刪除後無法復原。</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteItemId(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button onClick={confirmDeleteItem} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">刪除</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Open Confirm ──────────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="text-4xl mb-3">🎊</div>
            <h2 className="font-bold text-gray-900 text-lg mb-2">確認開幕？</h2>
            <p className="text-sm text-gray-500 mb-5">店面狀態將更新為「營運中」</p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button
                onClick={async () => {
                  await supabase.from('stores').update({ status: 'open' }).eq('id', id)
                  setShowConfirm(false)
                  window.location.href = `/stores/${id}/overview`
                }}
                className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700"
              >
                確認開幕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
