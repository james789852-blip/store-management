'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Document as StoreDocument, DocType, DocStatus } from '@/types'
import { DOC_TYPE_LABEL, DOC_STATUS_LABEL } from '@/types'
import { DOC_TYPE_BADGE, DOC_STATUS_BADGE } from '@/lib/colors'
import FileUploader from '@/components/FileUploader'

type DocTypeFilter = 'all' | DocType

type DocForm = {
  name: string
  doc_type: DocType
  status: DocStatus
  party: string
  sign_date: string
  exp_date: string
  file_url: string
  note: string
}

function emptyForm(): DocForm {
  return {
    name: '',
    doc_type: 'other',
    status: 'none',
    party: '',
    sign_date: '',
    exp_date: '',
    file_url: '',
    note: '',
  }
}


function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const TEMPLATE_DOCS: { name: string; doc_type: DocType }[] = [
  { name: '房屋租賃契約', doc_type: 'lease' },
  { name: '房東同意書', doc_type: 'consent' },
  { name: '使用執照', doc_type: 'permit' },
  { name: '消防安全設施申報', doc_type: 'permit' },
  { name: '營業登記', doc_type: 'other' },
]

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>()
  const [docs, setDocs] = useState<StoreDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<DocForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<DocTypeFilter>('all')
  const [creatingTemplates, setCreatingTemplates] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('store_id', id)
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = {
      store_id: id,
      name: form.name,
      doc_type: form.doc_type,
      status: form.status,
      party: form.party || null,
      sign_date: form.sign_date || null,
      exp_date: (form.exp_date && form.exp_date !== 'none') ? form.exp_date : null,
      file_url: form.file_url || null,
      note: form.note || null,
    }
    if (editId) {
      await supabase.from('documents').update(payload).eq('id', editId)
    } else {
      await supabase.from('documents').insert(payload)
    }
    setSaving(false)
    closeModal()
    load()
  }

  async function confirmDelete(docId: string) {
    await supabase.from('documents').delete().eq('id', docId)
    setDeleteConfirm(null)
    load()
  }

  async function createTemplates() {
    setCreatingTemplates(true)
    const rows = TEMPLATE_DOCS.map(t => ({
      store_id: id,
      name: t.name,
      doc_type: t.doc_type,
      status: 'none' as DocStatus,
      party: null,
      sign_date: null,
      exp_date: null,
      file_url: null,
      note: null,
    }))
    await supabase.from('documents').insert(rows)
    setCreatingTemplates(false)
    load()
  }

  function openAdd() {
    setForm(emptyForm())
    setEditId(null)
    setShowModal(true)
  }

  function startEdit(doc: StoreDocument) {
    setForm({
      name: doc.name,
      doc_type: doc.doc_type,
      status: doc.status,
      party: doc.party || '',
      sign_date: doc.sign_date || '',
      exp_date: doc.exp_date || '',
      file_url: doc.file_url || '',
      note: doc.note || '',
    })
    setEditId(doc.id)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm())
  }

  const filtered = docs.filter(d =>
    typeFilter === 'all' || d.doc_type === typeFilter
  )

  const countByStatus = (status: DocStatus) => docs.filter(d => d.status === status).length
  const urgentDocs = docs.filter(d => d.status === 'expiring' || d.status === 'expired')

  const inputCls = 'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'text-xs font-medium text-gray-600'

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">文件管理</h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5">
                <p className="text-xs text-gray-400">全部</p>
                <p className="text-lg font-bold text-gray-900">{docs.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5">
                <p className="text-xs text-gray-400">有效</p>
                <p className="text-lg font-bold text-green-600">{countByStatus('ok')}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5">
                <p className="text-xs text-gray-400">即將到期</p>
                <p className="text-lg font-bold text-amber-500">{countByStatus('expiring')}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5">
                <p className="text-xs text-gray-400">已到期</p>
                <p className="text-lg font-bold text-red-500">{countByStatus('expired')}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5">
                <p className="text-xs text-gray-400">未取得</p>
                <p className="text-lg font-bold text-gray-400">{countByStatus('none')}</p>
              </div>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="mt-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增文件
          </button>
        </div>

        {/* Alert Banner */}
        {urgentDocs.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <p className="text-sm font-semibold text-red-700 mb-1">注意：有文件需要處理</p>
            <ul className="space-y-1">
              {urgentDocs.map(d => (
                <li key={d.id} className="text-sm text-red-600 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOC_STATUS_BADGE[d.status]}`}>
                    {DOC_STATUS_LABEL[d.status]}
                  </span>
                  <span className="font-medium">{d.name}</span>
                  {d.exp_date && (
                    <span className="text-red-400 text-xs">到期日：{d.exp_date}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Type Tabs */}
        {docs.length > 0 && (
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden mb-5 w-fit">
            {([['all', '全部'], ['lease', '租約'], ['consent', '同意書'], ['permit', '許可證'], ['other', '其他']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTypeFilter(val as DocTypeFilter)}
                className={`px-4 py-2 text-sm transition-colors ${typeFilter === val ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {docs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600 mb-1">尚無文件記錄</p>
            <p className="text-sm mb-6">點擊「新增文件」開始管理門市相關文件</p>
            <button
              onClick={createTemplates}
              disabled={creatingTemplates}
              className="bg-gray-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {creatingTemplates ? '建立中...' : '一鍵建立常用文件'}
            </button>
            <p className="text-xs text-gray-400 mt-3">將新增：房屋租賃契約、房東同意書、使用執照、消防安全設施申報、營業登記</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-base font-medium text-gray-500">沒有符合分類的文件</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(doc => {
              const days = doc.exp_date ? daysUntil(doc.exp_date) : null
              const daysColor = days !== null
                ? days < 30 ? 'text-red-500 font-semibold'
                : days < 90 ? 'text-amber-500 font-semibold'
                : 'text-gray-400'
                : ''

              return (
                <div key={doc.id} className="bg-white rounded-2xl border border-gray-200 p-5 group hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Name + badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900 text-base">{doc.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOC_TYPE_BADGE[doc.doc_type]}`}>
                          {DOC_TYPE_LABEL[doc.doc_type]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOC_STATUS_BADGE[doc.status]}`}>
                          {DOC_STATUS_LABEL[doc.status]}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                        {doc.party && (
                          <span>當事方：<span className="text-gray-700">{doc.party}</span></span>
                        )}
                        {doc.sign_date && (
                          <span>簽署日：<span className="text-gray-700">{doc.sign_date}</span></span>
                        )}
                        {doc.exp_date && (
                          <span>
                            到期日：<span className="text-gray-700">{doc.exp_date}</span>
                            {days !== null && (
                              <span className={`ml-1.5 ${daysColor}`}>
                                {days >= 0 ? `（剩 ${days} 天）` : `（已逾期 ${Math.abs(days)} 天）`}
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* File URL */}
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          開啟檔案
                        </a>
                      )}

                      {/* Note */}
                      {doc.note && (
                        <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5">{doc.note}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 transition-opacity shrink-0">
                      <button
                        onClick={() => startEdit(doc)}
                        className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">
                        編輯
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(doc.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1">
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[92vh] flex flex-col">
              <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-lg">{editId ? '編輯文件' : '新增文件'}</h2>
              </div>

              <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-4">
                <div>
                  <label className={labelCls}>文件名稱 *</label>
                  <input
                    autoFocus
                    className={inputCls}
                    placeholder="例：房屋租賃契約"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>文件類型</label>
                    <select
                      className={inputCls}
                      value={form.doc_type}
                      onChange={e => setForm(f => ({ ...f, doc_type: e.target.value as DocType }))}>
                      <option value="lease">租約</option>
                      <option value="consent">同意書</option>
                      <option value="permit">許可證</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>狀態</label>
                    <select
                      className={inputCls}
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as DocStatus }))}>
                      <option value="ok">有效</option>
                      <option value="pending">處理中</option>
                      <option value="expiring">即將到期</option>
                      <option value="expired">已到期</option>
                      <option value="none">未取得</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>當事方（房東／機關名稱等）</label>
                  <input
                    className={inputCls}
                    placeholder="例：台北市政府"
                    value={form.party}
                    onChange={e => setForm(f => ({ ...f, party: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>簽署日期</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={form.sign_date}
                      onChange={e => setForm(f => ({ ...f, sign_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      到期日期
                      <span className="ml-1.5 text-gray-400 font-normal">（選填）</span>
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="date"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                        value={form.exp_date}
                        disabled={form.exp_date === 'none'}
                        onChange={e => setForm(f => ({ ...f, exp_date: e.target.value }))}
                      />
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={form.exp_date === 'none'}
                          onChange={e => setForm(f => ({ ...f, exp_date: e.target.checked ? 'none' : '' }))}
                        />
                        無到期日
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>上傳檔案</label>
                  <div className="mt-1">
                    <FileUploader
                      folderPath={`documents/${id}`}
                      value={form.file_url ? [form.file_url] : []}
                      onChange={urls => setForm(f => ({ ...f, file_url: urls[0] || '' }))}
                      multiple={false}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                  </div>
                  <input
                    type="url"
                    className={`${inputCls} mt-2`}
                    placeholder="或貼上外部連結 https://..."
                    value={form.file_url}
                    onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={labelCls}>備註</label>
                  <textarea
                    rows={3}
                    className={`${inputCls} resize-none`}
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  />
                </div>
              </div>

              <div className="px-5 sm:px-6 pb-6 pt-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={!form.name || saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
              <h2 className="font-bold text-gray-900 text-lg mb-2">確認刪除</h2>
              <p className="text-sm text-gray-500 mb-6">此操作無法復原，確定要刪除這份文件嗎？</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button
                  onClick={() => confirmDelete(deleteConfirm)}
                  className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors">
                  刪除
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
