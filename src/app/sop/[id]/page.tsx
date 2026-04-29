'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { SOPDocument, SOPStep } from '@/types'
import Link from 'next/link'

const CATEGORIES = ['工程', '行政', '設備', '營運', '其他']

const categoryColor: Record<string, string> = {
  '工程': 'bg-blue-100 text-blue-800',
  '行政': 'bg-purple-100 text-purple-800',
  '設備': 'bg-orange-100 text-orange-800',
  '營運': 'bg-green-100 text-green-800',
  '其他': 'bg-gray-100 text-gray-800',
}

const emptyStepForm = { title: '', content: '', estimated_days: '', responsible: '', notes: '' }

export default function SOPDocPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<SOPDocument | null>(null)
  const [steps, setSteps] = useState<SOPStep[]>([])
  const [loading, setLoading] = useState(true)

  const [editingDoc, setEditingDoc] = useState(false)
  const [docForm, setDocForm] = useState({ title: '', description: '', category: '' })
  const [savingDoc, setSavingDoc] = useState(false)

  const [showStepModal, setShowStepModal] = useState(false)
  const [editingStep, setEditingStep] = useState<SOPStep | null>(null)
  const [stepForm, setStepForm] = useState(emptyStepForm)
  const [savingStep, setSavingStep] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: docData }, { data: stepsData }] = await Promise.all([
      supabase.from('sop_documents').select('*').eq('id', id).single(),
      supabase.from('sop_steps').select('*').eq('document_id', id).order('order_index'),
    ])
    setDoc(docData)
    setSteps(stepsData || [])
    setLoading(false)
  }

  function startEditDoc() {
    if (!doc) return
    setDocForm({ title: doc.title, description: doc.description || '', category: doc.category || '其他' })
    setEditingDoc(true)
  }

  async function saveDoc() {
    if (!docForm.title) return
    setSavingDoc(true)
    await supabase.from('sop_documents').update({
      title: docForm.title,
      description: docForm.description || null,
      category: docForm.category,
    }).eq('id', id)
    setSavingDoc(false)
    setEditingDoc(false)
    loadData()
  }

  async function deleteDoc() {
    if (!confirm('確定要刪除這份 SOP 文件嗎？所有步驟也會一併刪除。')) return
    await supabase.from('sop_documents').delete().eq('id', id)
    window.location.href = '/sop'
  }

  function openAddStep() {
    setEditingStep(null)
    setStepForm(emptyStepForm)
    setShowStepModal(true)
  }

  function openEditStep(step: SOPStep) {
    setEditingStep(step)
    setStepForm({
      title: step.title,
      content: step.content || '',
      estimated_days: step.estimated_days?.toString() || '',
      responsible: step.responsible || '',
      notes: step.notes || '',
    })
    setShowStepModal(true)
  }

  async function saveStep() {
    if (!stepForm.title) return
    setSavingStep(true)
    const payload = {
      title: stepForm.title,
      content: stepForm.content || null,
      estimated_days: stepForm.estimated_days ? Number(stepForm.estimated_days) : null,
      responsible: stepForm.responsible || null,
      notes: stepForm.notes || null,
    }
    if (editingStep) {
      await supabase.from('sop_steps').update(payload).eq('id', editingStep.id)
    } else {
      await supabase.from('sop_steps').insert({ ...payload, document_id: id, order_index: steps.length })
    }
    setSavingStep(false)
    setShowStepModal(false)
    loadData()
  }

  async function deleteStep(stepId: string) {
    if (!confirm('確定要刪除這個步驟？')) return
    await supabase.from('sop_steps').delete().eq('id', stepId)
    loadData()
  }

  async function moveStep(stepId: string, direction: 'up' | 'down') {
    const idx = steps.findIndex(s => s.id === stepId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= steps.length) return
    const step = steps[idx]
    const swap = steps[swapIdx]
    await Promise.all([
      supabase.from('sop_steps').update({ order_index: swap.order_index }).eq('id', step.id),
      supabase.from('sop_steps').update({ order_index: step.order_index }).eq('id', swap.id),
    ])
    loadData()
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">載入中...</div>
  if (!doc) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">找不到文件</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/sop" className="text-sm text-gray-500 hover:text-gray-700">← 回 SOP 列表</Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/sop/${id}/print`, '_blank')}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              ⬇ 下載 PDF
            </button>
            <button
              onClick={startEditDoc}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              ✏ 編輯文件
            </button>
            <button
              onClick={deleteDoc}
              className="text-red-500 px-3 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors">
              刪除
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Document header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
                {doc.category && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColor[doc.category] || 'bg-gray-100 text-gray-600'}`}>
                    {doc.category}
                  </span>
                )}
              </div>
              {doc.description
                ? <p className="text-gray-600">{doc.description}</p>
                : <p className="text-gray-400 text-sm italic">尚無說明</p>
              }
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">步驟清單（共 {steps.length} 步）</h2>
          <button
            onClick={openAddStep}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增步驟
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-400">尚無步驟，點擊「新增步驟」開始建立流程</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      {step.estimated_days && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⏱ {step.estimated_days} 天</span>
                      )}
                      {step.responsible && (
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">👤 {step.responsible}</span>
                      )}
                    </div>
                    {step.content && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{step.content}</p>
                    )}
                    {step.notes && (
                      <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">📌 {step.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveStep(step.id, 'up')}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 p-1 text-xs leading-none">
                        ▲
                      </button>
                      <button
                        onClick={() => moveStep(step.id, 'down')}
                        disabled={idx === steps.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 p-1 text-xs leading-none">
                        ▼
                      </button>
                    </div>
                    <button
                      onClick={() => openEditStep(step)}
                      className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors text-sm">
                      ✏
                    </button>
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors text-sm">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {steps.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={openAddStep}
              className="text-blue-600 hover:underline text-sm">
              + 繼續新增步驟
            </button>
          </div>
        )}
      </main>

      {/* Edit document modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">編輯文件資訊</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">文件名稱 *</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={docForm.title}
                  onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">說明</label>
                <textarea
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  value={docForm.description}
                  onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">分類</label>
                <select
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={docForm.category}
                  onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditingDoc(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                取消
              </button>
              <button onClick={saveDoc} disabled={!docForm.title || savingDoc}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {savingDoc ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit step modal */}
      {showStepModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">{editingStep ? '編輯步驟' : '新增步驟'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">步驟名稱 *</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={stepForm.title}
                  onChange={e => setStepForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="例：申請建照、確認水電配置"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">詳細說明</label>
                <textarea
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  value={stepForm.content}
                  onChange={e => setStepForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="描述這個步驟的具體操作方式、注意事項..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 font-medium">預計天數</label>
                  <input
                    type="number"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={stepForm.estimated_days}
                    onChange={e => setStepForm(f => ({ ...f, estimated_days: e.target.value }))}
                    placeholder="如：7"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-medium">負責人</label>
                  <input
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={stepForm.responsible}
                    onChange={e => setStepForm(f => ({ ...f, responsible: e.target.value }))}
                    placeholder="如：店長、工班"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">備注</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={stepForm.notes}
                  onChange={e => setStepForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="補充說明、常見問題..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowStepModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                取消
              </button>
              <button onClick={saveStep} disabled={!stepForm.title || savingStep}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {savingStep ? '儲存中...' : editingStep ? '儲存' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
