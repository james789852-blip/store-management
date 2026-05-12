'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Expense, PayStatus } from '@/types'
import { PAY_STATUS_LABEL } from '@/types'
import { PAY_BADGE } from '@/lib/colors'
import FileUploader from '@/components/FileUploader'

const CATEGORY_SUGGESTIONS = ['裝潢工程', '水電', '設備', '設計', '招牌', '租金', '押金', '雜費']
const PAY_METHOD_SUGGESTIONS = ['現金', '轉帳', '支票']

type PayStatusFilter = 'all' | PayStatus

type ExpenseForm = {
  date: string
  category: string
  name: string
  vendor: string
  total: string
  pay_method: string
  pay_status: PayStatus
  pay_date: string
  deposit_amount: string
  deposit_date: string
  balance_amount: string
  balance_date: string
  invoice_no: string
  invoice_amount: string
  tax_amount: string
  note: string
  photos: string[]
}

function emptyForm(): ExpenseForm {
  return {
    date: new Date().toISOString().slice(0, 10),
    category: '',
    name: '',
    vendor: '',
    total: '',
    pay_method: '',
    pay_status: 'pending',
    pay_date: '',
    deposit_amount: '',
    deposit_date: '',
    balance_amount: '',
    balance_date: '',
    invoice_no: '',
    invoice_amount: '',
    tax_amount: '',
    note: '',
    photos: [],
  }
}

export default function ExpensesPage() {
  const { id } = useParams<{ id: string }>()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ExpenseForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<PayStatusFilter>('all')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('store_id', id)
      .order('date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.name || !form.total) return
    setSaving(true)
    const payload = {
      store_id: id,
      date: form.date,
      category: form.category || null,
      name: form.name,
      vendor: form.vendor || null,
      total: Number(form.total),
      pay_method: form.pay_method || null,
      pay_status: form.pay_status,
      pay_date: form.pay_date || null,
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null,
      deposit_date: form.deposit_date || null,
      balance_amount: form.balance_amount ? Number(form.balance_amount) : null,
      balance_date: form.balance_date || null,
      invoice_no: form.invoice_no || null,
      invoice_amount: form.invoice_amount ? Number(form.invoice_amount) : null,
      tax_amount: form.tax_amount ? Number(form.tax_amount) : null,
      photos: form.photos,
      note: form.note || null,
    }
    if (editId) {
      await supabase.from('expenses').update(payload).eq('id', editId)
    } else {
      await supabase.from('expenses').insert(payload)
    }
    setSaving(false)
    closeModal()
    load()
  }

  async function confirmDelete(expId: string) {
    await supabase.from('expenses').delete().eq('id', expId)
    setDeleteConfirm(null)
    load()
  }

  function openAdd() {
    setForm(emptyForm())
    setEditId(null)
    setShowModal(true)
  }

  function startEdit(e: Expense) {
    setForm({
      date: e.date,
      category: e.category || '',
      name: e.name,
      vendor: e.vendor || '',
      total: String(e.total),
      pay_method: e.pay_method || '',
      pay_status: e.pay_status,
      pay_date: e.pay_date || '',
      deposit_amount: e.deposit_amount != null ? String(e.deposit_amount) : '',
      deposit_date: e.deposit_date || '',
      balance_amount: e.balance_amount != null ? String(e.balance_amount) : '',
      balance_date: e.balance_date || '',
      invoice_no: e.invoice_no || '',
      invoice_amount: e.invoice_amount != null ? String(e.invoice_amount) : '',
      tax_amount: e.tax_amount != null ? String(e.tax_amount) : '',
      note: e.note || '',
      photos: e.photos || [],
    })
    setEditId(e.id)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm())
  }

  function f(val: string, setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setter(e.target.value)
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = filtered.map(e => ({
      日期: e.date,
      類別: e.category || '',
      品項: e.name,
      廠商: e.vendor || '',
      金額: e.total,
      付款方式: e.pay_method || '',
      付款狀態: PAY_STATUS_LABEL[e.pay_status],
      付款日期: e.pay_date || '',
      訂金: e.deposit_amount ?? '',
      訂金日期: e.deposit_date || '',
      尾款: e.balance_amount ?? '',
      尾款日期: e.balance_date || '',
      發票號碼: e.invoice_no || '',
      發票金額: e.invoice_amount ?? '',
      稅外加金額: e.tax_amount ?? '',
      備註: e.note || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '費用記錄')
    XLSX.writeFile(wb, `費用記錄_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Derived data
  const allCategories = Array.from(new Set(expenses.map(e => e.category).filter(Boolean))) as string[]

  const filtered = expenses.filter(e => {
    const catOk = categoryFilter === 'all' || e.category === categoryFilter
    const statOk = statusFilter === 'all' || e.pay_status === statusFilter
    return catOk && statOk
  })

  const totalAll = expenses.reduce((s, e) => s + e.total, 0)
  const totalPaid = expenses.filter(e => e.pay_status === 'paid').reduce((s, e) => s + e.total, 0)
  const totalPending = expenses.filter(e => e.pay_status === 'pending').reduce((s, e) => s + e.total, 0)
  const totalTax = expenses.reduce((s, e) => s + (e.tax_amount ?? 0), 0)
  const filteredTotal = filtered.reduce((s, e) => s + e.total, 0)

  const inputCls = 'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'text-xs font-medium text-gray-600'

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">費用記錄</h1>
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-3">
              <div className="bg-white rounded-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5">
                <p className="text-xs text-gray-400">總金額</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">NT$ {totalAll.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5">
                <p className="text-xs text-gray-400">已付清</p>
                <p className="text-base sm:text-lg font-bold text-green-600">NT$ {totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5">
                <p className="text-xs text-gray-400">未付款</p>
                <p className="text-base sm:text-lg font-bold text-gray-500">NT$ {totalPending.toLocaleString()}</p>
              </div>
              {totalTax > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 px-3 sm:px-4 py-2 sm:py-2.5">
                  <p className="text-xs text-amber-600">稅外加合計</p>
                  <p className="text-base sm:text-lg font-bold text-amber-700">NT$ {totalTax.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {expenses.length > 0 && (
              <button onClick={exportExcel}
                className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                匯出 Excel
              </button>
            )}
            <button onClick={openAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              + 新增費用
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {expenses.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {/* Category dropdown */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">所有類別</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Status tabs */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              {([['all', '全部'], ['paid', '已付清'], ['partial', '部分付款'], ['pending', '未付款']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val as PayStatusFilter)}
                  className={`px-3 py-2 text-sm transition-colors ${statusFilter === val ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {expenses.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium text-gray-600 mb-1">尚無費用記錄</p>
            <p className="text-sm">點擊「新增費用」開始記錄每一筆建置費用</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-base font-medium text-gray-500">沒有符合篩選條件的記錄</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['日期', '類別', '品項', '廠商', '金額', '付款方式', '狀態', '照片', '操作'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(exp => {
                    const isExpanded = expandedId === exp.id
                    return (
                      <>
                        <tr key={exp.id}
                          onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                          className={`group border-t border-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{exp.date}</td>
                          <td className="px-4 py-3">
                            {exp.category
                              ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{exp.category}</span>
                              : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{exp.name}</td>
                          <td className="px-4 py-3 text-gray-500">{exp.vendor || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-semibold text-gray-800">NT$ {exp.total.toLocaleString()}</span>
                            {exp.tax_amount != null && exp.tax_amount > 0 && (
                              <p className="text-[10px] text-amber-600 font-medium mt-0.5">+稅 {exp.tax_amount.toLocaleString()}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{exp.pay_method || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAY_BADGE[exp.pay_status]}`}>
                              {PAY_STATUS_LABEL[exp.pay_status]}
                            </span>
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            {exp.photos?.length > 0 && (
                              <div className="flex gap-1">
                                {exp.photos.slice(0, 3).map(url => (
                                  <img key={url} src={url} alt="" onClick={() => setLightbox(url)}
                                    className="w-8 h-8 rounded-lg object-cover border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity" />
                                ))}
                                {exp.photos.length > 3 && (
                                  <button onClick={() => setLightbox(exp.photos[3])}
                                    className="text-xs text-gray-400 self-center hover:text-blue-500">
                                    +{exp.photos.length - 3}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 transition-opacity">
                              <button onClick={() => startEdit(exp)}
                                className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                              <button onClick={() => setDeleteConfirm(exp.id)}
                                className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${exp.id}-detail`} className="bg-blue-50 border-t border-blue-100">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                {exp.deposit_amount != null && (
                                  <>
                                    <div><p className="text-xs text-gray-400 mb-0.5">訂金</p><p className="font-medium">NT$ {exp.deposit_amount.toLocaleString()}{exp.deposit_date ? ` · ${exp.deposit_date}` : ''}</p></div>
                                    <div><p className="text-xs text-gray-400 mb-0.5">尾款</p><p className="font-medium">NT$ {(exp.balance_amount ?? 0).toLocaleString()}{exp.balance_date ? ` · ${exp.balance_date}` : ''}</p></div>
                                  </>
                                )}
                                {exp.pay_date && <div><p className="text-xs text-gray-400 mb-0.5">付款日期</p><p className="font-medium">{exp.pay_date}</p></div>}
                                {exp.invoice_no && <div><p className="text-xs text-gray-400 mb-0.5">發票號碼</p><p className="font-medium">{exp.invoice_no}{exp.invoice_amount ? ` · NT$ ${exp.invoice_amount.toLocaleString()}` : ''}</p></div>}
                                {exp.tax_amount != null && exp.tax_amount > 0 && (
                                  <div>
                                    <p className="text-xs text-amber-600 mb-0.5 font-semibold">稅外加金額</p>
                                    <p className="font-semibold text-amber-700">NT$ {exp.tax_amount.toLocaleString()}</p>
                                  </div>
                                )}
                                {exp.note && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-gray-400 mb-0.5">備註</p><p className="text-gray-700 whitespace-pre-wrap">{exp.note}</p></div>}
                                {exp.photos?.length > 0 && (
                                  <div className="col-span-2 sm:col-span-4">
                                    <p className="text-xs text-gray-400 mb-1.5">收據 / 照片</p>
                                    <div className="flex flex-wrap gap-2">
                                      {exp.photos.map(url => (
                                        <img key={url} src={url} alt="" onClick={() => setLightbox(url)}
                                          className="w-16 h-16 rounded-xl object-cover border border-blue-200 cursor-zoom-in hover:opacity-80 transition-opacity" />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                      合計 {filtered.length} 筆
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                      NT$ {filteredTotal.toLocaleString()}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
              <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-lg">{editId ? '編輯費用' : '新增費用'}</h2>
              </div>

              <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-6">
                {/* Section 1: 基本資訊 */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">基本資訊</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>日期</label>
                      <input type="date" className={inputCls}
                        value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>類別</label>
                      <input className={inputCls} list="category-list" placeholder="例：裝潢工程"
                        value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                      <datalist id="category-list">
                        {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>品項名稱 *</label>
                      <input autoFocus className={inputCls} placeholder="例：廚房排煙設備安裝"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>廠商</label>
                      <input className={inputCls}
                        value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>總金額 *</label>
                      <input type="number" className={inputCls} placeholder="0"
                        value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Section 2: 付款資訊 */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">付款資訊</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>付款方式</label>
                      <input className={inputCls} list="pay-method-list" placeholder="例：轉帳"
                        value={form.pay_method} onChange={e => setForm(f => ({ ...f, pay_method: e.target.value }))} />
                      <datalist id="pay-method-list">
                        {PAY_METHOD_SUGGESTIONS.map(m => <option key={m} value={m} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className={labelCls}>付款狀態</label>
                      <select className={inputCls}
                        value={form.pay_status} onChange={e => setForm(f => ({ ...f, pay_status: e.target.value as PayStatus }))}>
                        <option value="pending">未付款</option>
                        <option value="partial">部分付款</option>
                        <option value="paid">已付清</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>付款日期</label>
                      <input type="date" className={inputCls}
                        value={form.pay_date} onChange={e => setForm(f => ({ ...f, pay_date: e.target.value }))} />
                    </div>
                    <div />

                    <div>
                      <label className={labelCls}>訂金金額</label>
                      <input type="number" className={inputCls} placeholder="0"
                        value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>訂金日期</label>
                      <div className="flex items-center gap-1">
                        <input type="date" className={`${inputCls} flex-1`}
                          value={form.deposit_date} onChange={e => setForm(f => ({ ...f, deposit_date: e.target.value }))} />
                        {form.deposit_date && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, deposit_date: '' }))}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm mt-1">✕</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>尾款金額</label>
                      <input type="number" className={inputCls} placeholder="0"
                        value={form.balance_amount} onChange={e => setForm(f => ({ ...f, balance_amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>尾款日期</label>
                      <div className="flex items-center gap-1">
                        <input type="date" className={`${inputCls} flex-1`}
                          value={form.balance_date} onChange={e => setForm(f => ({ ...f, balance_date: e.target.value }))} />
                        {form.balance_date && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, balance_date: '' }))}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm mt-1">✕</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>發票號碼</label>
                      <input className={inputCls}
                        value={form.invoice_no} onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>發票金額</label>
                      <input type="number" className={inputCls} placeholder="0"
                        value={form.invoice_amount} onChange={e => setForm(f => ({ ...f, invoice_amount: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>
                        稅外加金額
                        <span className="ml-1.5 text-[10px] text-amber-600 font-normal">（開立發票時另外計算的稅額）</span>
                      </label>
                      <input type="number" className={`${inputCls} border-amber-200 focus:ring-amber-400`} placeholder="例：1050（5% 稅額）"
                        value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>備註</label>
                      <textarea rows={2} className={`${inputCls} resize-none`}
                        value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Section 3: 收據 / 照片 */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">收據 / 照片</h3>
                  <FileUploader
                    folderPath={`expenses/${id}`}
                    value={form.photos}
                    onChange={photos => setForm(f => ({ ...f, photos }))}
                    multiple
                    accept="image/*,.pdf"
                  />
                </div>
              </div>

              <div className="px-5 sm:px-6 pb-6 pt-4 border-t border-gray-100 flex gap-2">
                <button onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button onClick={save} disabled={!form.name || !form.total || saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out"
            onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
            <button onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full w-9 h-9 flex items-center justify-center text-lg transition-colors">
              ✕
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
              <h2 className="font-bold text-gray-900 text-lg mb-2">確認刪除</h2>
              <p className="text-sm text-gray-500 mb-6">此操作無法復原，確定要刪除這筆費用記錄嗎？</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button onClick={() => confirmDelete(deleteConfirm)}
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
