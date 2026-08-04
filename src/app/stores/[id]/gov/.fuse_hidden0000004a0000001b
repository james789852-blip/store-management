'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { GovApplication, GovStatus } from '@/types'
import { GOV_STATUS_LABEL } from '@/types'
import { GOV_STATUS_BADGE } from '@/lib/colors'

// ── Constants ────────────────────────────────────────────────

const CATEGORIES = ['衛生', '消防', '環保', '勞工', '工務', '稅務', '招牌', '其他']

const STATUS_ORDER: GovStatus[] = ['done', 'inprog', 'waiting', 'notyet']


const STATUS_ICON: Record<GovStatus, ReactElement> = {
  done: (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ),
  inprog: (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100">
      <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </span>
  ),
  waiting: (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    </span>
  ),
  notyet: (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  ),
}

const DEFAULT_APPLICATIONS: Array<Omit<GovApplication, 'id' | 'store_id' | 'created_at' | 'updated_at'>> = [
  {
    category: '稅務', name: '營業登記', status: 'notyet',
    description: '向國稅局辦理營業人設立登記，取得統一編號',
    tags: ['國稅局', '必要'], note: null,
  },
  {
    category: '衛生', name: '食品業者登錄', status: 'notyet',
    description: '依食品安全衛生管理法，向食品藥物管理署完成食品業者登錄',
    tags: ['食藥署', '必要'], note: null,
  },
  {
    category: '消防', name: '消防安全申報', status: 'notyet',
    description: '每年定期辦理消防安全設備檢修申報，確保符合消防法規',
    tags: ['消防局', '定期'], note: null,
  },
  {
    category: '環保', name: '水污染防治申報', status: 'notyet',
    description: '餐飲業廢水排放前須辦理水污染防治措施申請',
    tags: ['環保局'], note: null,
  },
  {
    category: '衛生', name: '食品良好衛生規範GHP', status: 'notyet',
    description: '依GHP規範建立衛生管理制度，必要時接受衛生局稽查',
    tags: ['衛生局', 'GHP'], note: null,
  },
  {
    category: '勞工', name: '員工健康檢查', status: 'notyet',
    description: '依勞工健康保護規則，定期安排員工健康檢查',
    tags: ['勞工局', '定期'], note: null,
  },
  {
    category: '招牌', name: '招牌申請', status: 'notyet',
    description: '向地方建管機關申請廣告物（招牌）許可',
    tags: ['建管處'], note: null,
  },
  {
    category: '勞工', name: '招募公告登錄', status: 'notyet',
    description: '依就業服務法規定，招募員工前須於公立就業服務機構辦理求才登記',
    tags: ['勞動部', '人力銀行'], note: null,
  },
  {
    category: '工務', name: '建築使用執照', status: 'notyet',
    description: '裝修完工後取得建築改建使用執照或室內裝修合格證明',
    tags: ['建管處', '必要'], note: null,
  },
  {
    category: '衛生', name: '廢棄物清除申請', status: 'notyet',
    description: '與合法廢棄物清除業者簽約並申報，確保廚餘、廢油合法處理',
    tags: ['環保局', '廚餘'], note: null,
  },
]

// ── Form type ────────────────────────────────────────────────

type GovForm = {
  name: string
  category: string
  description: string
  tagsRaw: string
  status: GovStatus
  note: string
}

function emptyForm(): GovForm {
  return { name: '', category: '', description: '', tagsRaw: '', status: 'notyet', note: '' }
}

function appToForm(app: GovApplication): GovForm {
  return {
    name: app.name,
    category: app.category ?? '',
    description: app.description ?? '',
    tagsRaw: app.tags.join(', '),
    status: app.status,
    note: app.note ?? '',
  }
}

// ── Component ────────────────────────────────────────────────

export default function GovPage() {
  const { id } = useParams<{ id: string }>()
  const [apps, setApps] = useState<GovApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('全部')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<GovForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase
      .from('gov_applications')
      .select('*')
      .eq('store_id', id)
      .order('created_at')
    setApps(data || [])
    setLoading(false)
  }

  // ── Derived ──────────────────────────────────────────────

  const total = apps.length
  const doneCount = apps.filter(a => a.status === 'done').length
  const progressPct = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  const dynamicCategories = [...new Set(apps.map(a => a.category).filter(Boolean))] as string[]
  const tabs = ['全部', ...dynamicCategories]

  const filtered = activeTab === '全部' ? apps : apps.filter(a => a.category === activeTab)
  const sorted = [...filtered].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status)
    const bi = STATUS_ORDER.indexOf(b.status)
    return ai - bi
  })

  // ── Actions ──────────────────────────────────────────────

  function openAdd() {
    setEditId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  function openEdit(app: GovApplication) {
    setEditId(app.id)
    setForm(appToForm(app))
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm())
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const tags = form.tagsRaw
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    const payload = {
      store_id: id,
      name: form.name.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      tags,
      status: form.status,
      note: form.note.trim() || null,
    }
    if (editId) {
      await supabase.from('gov_applications').update(payload).eq('id', editId)
    } else {
      await supabase.from('gov_applications').insert(payload)
    }
    setSaving(false)
    closeModal()
    load()
  }

  async function deleteApp(appId: string) {
    await supabase.from('gov_applications').delete().eq('id', appId)
    setConfirmDeleteId(null)
    load()
  }

  async function seedDefaults() {
    const payload = DEFAULT_APPLICATIONS.map(a => ({ ...a, store_id: id }))
    await supabase.from('gov_applications').insert(payload)
    load()
  }

  // ── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">載入中…</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-gray-50 min-h-screen">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">政府申請</h1>
          {total > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-500">完成 {doneCount} / 總 {total}</span>
              <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600">{progressPct}%</span>
            </div>
          )}
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          ＋ 新增申請項目
        </button>
      </div>

      {/* ── Empty state ── */}
      {total === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400 mb-2">尚無申請項目</p>
          <p className="text-gray-400 text-sm mb-6">點選下方按鈕快速建立台灣餐飲業常見申請清單</p>
          <button
            onClick={seedDefaults}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            一鍵建立常用申請
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      {total > 0 && (
        <>
          <div className="flex gap-2 flex-wrap mb-4">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                }`}
              >
                {tab}
                {tab === '全部'
                  ? <span className="ml-1.5 opacity-70">({total})</span>
                  : <span className="ml-1.5 opacity-70">({apps.filter(a => a.category === tab).length})</span>
                }
              </button>
            ))}
          </div>

          {/* ── Application list ── */}
          <div className="space-y-3">
            {sorted.map(app => (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3"
              >
                {/* Status icon */}
                <div className="shrink-0 pt-0.5">{STATUS_ICON[app.status]}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-sm">{app.name}</span>
                    {app.category && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {app.category}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GOV_STATUS_BADGE[app.status]}`}>
                      {GOV_STATUS_LABEL[app.status]}
                    </span>
                  </div>

                  {app.description && (
                    <p className="text-xs text-gray-400 mb-1.5 leading-relaxed">{app.description}</p>
                  )}

                  {app.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {app.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {app.note && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 mt-1">
                      備註：{app.note}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex flex-col gap-1 items-end">
                  <button
                    onClick={() => openEdit(app)}
                    className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 rounded transition-colors"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(app.id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">
                {editId ? '編輯申請項目' : '新增申請項目'}
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名稱 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：食品業者登錄"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                  <input
                    type="text"
                    list="gov-categories"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="選擇或輸入分類"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <datalist id="gov-categories">
                    {CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">說明</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="簡短說明申請內容或注意事項"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    標籤
                    <span className="text-gray-400 font-normal ml-1">（逗號分隔）</span>
                  </label>
                  <input
                    type="text"
                    value={form.tagsRaw}
                    onChange={e => setForm(f => ({ ...f, tagsRaw: e.target.value }))}
                    placeholder="例：衛生局, 必要, 定期"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  {form.tagsRaw.trim() && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as GovStatus }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  >
                    {STATUS_ORDER.map(s => (
                      <option key={s} value={s}>{GOV_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                  <textarea
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    rows={2}
                    placeholder="聯絡窗口、辦理進度等補充說明"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {saving ? '儲存中…' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-800 mb-2">確認刪除</h3>
            <p className="text-sm text-gray-500 mb-5">刪除後無法還原，確定要刪除此申請項目嗎？</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => deleteApp(confirmDeleteId)}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
