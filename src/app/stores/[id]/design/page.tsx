'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { DesignFile } from '@/types'

const CATEGORIES = ['平面圖', 'Logo', '菜單', '招牌設計', '裝潢設計圖', '其他']

export default function DesignPage() {
  const { id } = useParams<{ id: string }>()
  const [files, setFiles] = useState<DesignFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('design_files').select('*').eq('store_id', id).order('category').order('created_at')
    setFiles(data || [])
    setLoading(false)
  }

  async function upload(file: File) {
    if (!name) { alert('請先填寫檔案名稱'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${id}/design/${Date.now()}.${ext}`
    await supabase.storage.from('design-files').upload(path, file)
    await supabase.from('design_files').insert({
      store_id: id, category, name,
      file_path: path, file_name: file.name, notes: notes || null
    })
    setUploading(false)
    setShowAdd(false)
    setName('')
    setNotes('')
    load()
  }

  async function deleteFile(f: DesignFile) {
    if (f.file_path) await supabase.storage.from('design-files').remove([f.file_path])
    await supabase.from('design_files').delete().eq('id', f.id)
    load()
  }

  async function openFile(f: DesignFile) {
    if (!f.file_path) return
    const { data } = supabase.storage.from('design-files').getPublicUrl(f.file_path)
    if (data) window.open(data.publicUrl, '_blank')
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = files.filter(f => f.category === cat)
    return acc
  }, {} as Record<string, DesignFile[]>)

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設計資料</h1>
          <p className="text-sm text-gray-400 mt-0.5">共 {files.length} 個檔案</p>
        </div>
        <button onClick={() => { setShowAdd(true); setCategory(CATEGORIES[0]); setName(''); setNotes('') }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + 上傳檔案
        </button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無設計檔案</p>
          <p className="text-sm">上傳平面圖、Logo、菜單設計等相關檔案</p>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const catFiles = grouped[cat]
            if (catFiles.length === 0) return null
            return (
              <div key={cat}>
                <h2 className="font-semibold text-gray-700 text-sm mb-3">{cat}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {catFiles.map(f => {
                    const isImage = f.file_name && /\.(png|jpg|jpeg|gif|webp)$/i.test(f.file_name)
                    return (
                      <div key={f.id} className="bg-white rounded-2xl border border-gray-200 p-4 group hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => openFile(f)}>
                        <div className="w-full h-24 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                          {isImage ? (
                            <span className="text-3xl">🖼</span>
                          ) : (
                            <span className="text-3xl">📄</span>
                          )}
                        </div>
                        <p className="font-medium text-gray-800 text-sm truncate">{f.name}</p>
                        {f.file_name && <p className="text-xs text-gray-400 truncate">{f.file_name}</p>}
                        {f.notes && <p className="text-xs text-gray-400 mt-1">{f.notes}</p>}
                        <button onClick={e => { e.stopPropagation(); deleteFile(f) }}
                          className="mt-2 opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity">
                          刪除
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-5">上傳設計檔案</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">分類</label>
                <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">名稱 *</label>
                <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={name} onChange={e => setName(e.target.value)} placeholder="例：一樓平面圖 v2" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">選擇檔案</label>
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
                <button onClick={() => fileRef.current?.click()} disabled={!name || uploading}
                  className="mt-1 w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 disabled:opacity-50 transition-colors">
                  {uploading ? '上傳中...' : '點擊選擇檔案（圖片、PDF、任意格式）'}
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
