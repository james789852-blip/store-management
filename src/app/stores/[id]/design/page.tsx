'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DESIGN_CATEGORY_LABEL } from '@/types'
import type { DesignFile, DesignCategory } from '@/types'
import { DESIGN_CAT_BADGE } from '@/lib/colors'
import FileUploader from '@/components/FileUploader'


const ALL_CATS: Array<'all' | DesignCategory> = ['all', 'logo', 'signage', 'menu', 'floorplan', 'other']
const FILE_TYPE_OPTIONS = ['PDF', 'AI', 'PSD', 'PNG', 'JPG', 'SVG', 'DWG', 'XLSX', '其他']

type FormData = {
  name: string
  category: DesignCategory
  version: string
  description: string
  file_urls: string[]
  file_type: string
}

const EMPTY_FORM: FormData = {
  name: '', category: 'other', version: '', description: '', file_urls: [], file_type: '',
}

function parseFileUrls(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return [raw]
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url)
}

export default function DesignPage() {
  const { id } = useParams<{ id: string }>()
  const [files, setFiles] = useState<DesignFile[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState<'all' | DesignCategory>('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DesignFile | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DesignFile | null>(null)

  useEffect(() => { load() }, [id])  // eslint-disable-line

  async function load() {
    const { data } = await supabase
      .from('design_files')
      .select('*')
      .eq('store_id', id)
      .order('created_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(f: DesignFile) {
    setEditing(f)
    setForm({
      name: f.name,
      category: f.category,
      version: f.version || '',
      description: f.description || '',
      file_urls: parseFileUrls(f.file_url),
      file_type: f.file_type || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = {
      store_id: id,
      name: form.name,
      category: form.category,
      version: form.version || null,
      description: form.description || null,
      file_url: form.file_urls.length > 0 ? JSON.stringify(form.file_urls) : null,
      file_type: form.file_type || null,
    }
    if (editing) {
      await supabase.from('design_files').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('design_files').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  async function del() {
    if (!deleteTarget) return
    await supabase.from('design_files').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const filtered = catFilter === 'all' ? files : files.filter(f => f.category === catFilter)
  const counts = (['logo', 'signage', 'menu', 'floorplan', 'other'] as DesignCategory[]).reduce((acc, c) => {
    acc[c] = files.filter(f => f.category === c).length
    return acc
  }, {} as Record<DesignCategory, number>)

  return (
    <div className="bg-gray-50 min-h-full p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">設計檔案</h1>
            <p className="text-sm text-gray-400 mt-0.5">共 {files.length} 個檔案</p>
          </div>
          <button onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增檔案
          </button>
        </div>

        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {ALL_CATS.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${catFilter === c ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {c === 'all' ? '全部' : DESIGN_CATEGORY_LABEL[c as DesignCategory]}
              {c !== 'all' && counts[c as DesignCategory] > 0 && (
                <span className={`ml-1.5 text-xs ${catFilter === c ? 'text-gray-300' : 'text-gray-400'}`}>
                  {counts[c as DesignCategory]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3 text-2xl">🎨</div>
            <p className="text-gray-500 font-medium mb-1">尚無設計檔案</p>
            <p className="text-gray-400 text-sm mb-4">新增 Logo、菜單、平面圖等設計資料</p>
            <button onClick={openAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              + 新增檔案
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all group relative">
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DESIGN_CAT_BADGE[f.category]}`}>
                    {DESIGN_CATEGORY_LABEL[f.category]}
                  </span>
                  {f.version && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      v{f.version}
                    </span>
                  )}
                  {f.file_type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                      {f.file_type}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-gray-900 mb-1 leading-snug">{f.name}</h3>
                {f.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{f.description}</p>
                )}

                {(() => {
                  const urls = parseFileUrls(f.file_url)
                  const images = urls.filter(isImageUrl)
                  const others = urls.filter(u => !isImageUrl(u))
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {images.length > 0 && (
                        <div className={`grid gap-1 mb-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {images.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" className="w-full h-20 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {others.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline font-medium">
                              檔案 {others.length > 1 ? i + 1 : ''} →
                            </a>
                          ))}
                          {urls.length === 0 && <span className="text-sm text-gray-300">無連結</span>}
                        </div>
                        <p className="text-xs text-gray-300 shrink-0">{f.created_at.slice(0, 10)}</p>
                      </div>
                    </div>
                  )
                })()}

                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(f)}
                    className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 shadow-sm">
                    編輯
                  </button>
                  <button onClick={() => setDeleteTarget(f)}
                    className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-500 shadow-sm">
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editing ? '編輯檔案' : '新增檔案'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">檔案名稱 *</label>
                <input autoFocus
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：梁平 Logo 最終版" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">類別</label>
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as DesignCategory }))}>
                    {(['logo', 'signage', 'menu', 'floorplan', 'other'] as DesignCategory[]).map(c => (
                      <option key={c} value={c}>{DESIGN_CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">版本</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                    placeholder="1.0" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">說明</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">上傳檔案（可多選）</label>
                <div className="mt-1">
                  <FileUploader
                    folderPath={`design/${id}`}
                    value={form.file_urls}
                    onChange={urls => setForm(f => ({ ...f, file_urls: urls }))}
                    multiple={true}
                    accept="image/*,.pdf,.ai,.psd,.svg,.dwg,.xlsx"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">檔案類型</label>
                <input list="ft-list"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.file_type} onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))}
                  placeholder="PDF" />
                <datalist id="ft-list">
                  {FILE_TYPE_OPTIONS.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button onClick={save} disabled={!form.name || saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 mb-2">確認刪除</h2>
            <p className="text-sm text-gray-500 mb-5">確定刪除「{deleteTarget.name}」？此操作無法復原。</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button onClick={del}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
