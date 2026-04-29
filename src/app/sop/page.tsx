'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SOPDocument } from '@/types'
import Link from 'next/link'

const categoryColor: Record<string, string> = {
  '工程': 'bg-blue-100 text-blue-800',
  '行政': 'bg-purple-100 text-purple-800',
  '設備': 'bg-orange-100 text-orange-800',
  '營運': 'bg-green-100 text-green-800',
  '其他': 'bg-gray-100 text-gray-800',
}

const CATEGORIES = ['工程', '行政', '設備', '營運', '其他']

export default function SOPPage() {
  const [docs, setDocs] = useState<SOPDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '其他' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    const { data } = await supabase
      .from('sop_documents')
      .select('*')
      .order('order_index')
      .order('created_at')
    setDocs(data || [])
    setLoading(false)
  }

  async function addDoc() {
    if (!form.title) return
    setSaving(true)
    await supabase.from('sop_documents').insert({
      title: form.title,
      description: form.description || null,
      category: form.category,
      order_index: docs.length,
    })
    setForm({ title: '', description: '', category: '其他' })
    setShowAdd(false)
    setSaving(false)
    loadDocs()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 回店面列表</Link>
            <span className="text-gray-300">|</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SOP 知識庫</h1>
              <p className="text-sm text-gray-500 mt-0.5">開店流程與作業標準</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增文件
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400">載入中...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-gray-500 text-lg font-medium">尚無 SOP 文件</p>
            <p className="text-gray-400 text-sm mt-1">建立開店流程、行政清單等作業標準，可下載 PDF 分享給合作夥伴</p>
            <button onClick={() => setShowAdd(true)} className="mt-5 text-blue-600 hover:underline text-sm">
              新增第一份文件
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <Link key={doc.id} href={`/sop/${doc.id}`}>
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-gray-900">{doc.title}</h2>
                        {doc.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${categoryColor[doc.category] || 'bg-gray-100 text-gray-600'}`}>
                            {doc.category}
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{doc.description}</p>
                      )}
                    </div>
                    <span className="text-gray-300 ml-4 text-lg">›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">新增 SOP 文件</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">文件名稱 *</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="例：裝潢工程 SOP、開幕前行政清單"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">說明</label>
                <textarea
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="這份文件的用途說明"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">分類</label>
                <select
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowAdd(false); setForm({ title: '', description: '', category: '其他' }) }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                取消
              </button>
              <button
                onClick={addDoc}
                disabled={!form.title || saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? '儲存中...' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
