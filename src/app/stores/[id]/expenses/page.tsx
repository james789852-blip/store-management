'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Expense, PayStatus } from '@/types'
import { PAY_STATUS_LABEL } from '@/types'
import { PAY_BADGE } from '@/lib/colors'
import FileUploader from '@/components/FileUploader'

const CATEGORY_SUGGESTIONS = ['裝潢工程', '水電', '設備', '設計', '招牌', '租金', '押金', '雜費']
const PAY_METHOD_SUGGESTIONS = ['現金', '轉帳', '支票', '信用卡']

// 類別圖示與配色(找不到就用預設)
const CAT_META: Record<string, { icon: string; color: string; bg: string }> = {
  '裝潢工程': { icon: '🔨', color: '#B45309', bg: '#FBF1E4' },
  '工程':     { icon: '🔨', color: '#B45309', bg: '#FBF1E4' },
  '水電':     { icon: '💡', color: '#BA7517', bg: '#FAEEDA' },
  '設備':     { icon: '🧊', color: '#185FA5', bg: '#E8F2FC' },
  '設計':     { icon: '🎨', color: '#534AB7', bg: '#EDEEF8' },
  '招牌':     { icon: '🪧', color: '#D4537E', bg: '#FBEAF0' },
  '租金':     { icon: '🏠', color: '#534AB7', bg: '#EDEEF8' },
  '押金':     { icon: '🏠', color: '#534AB7', bg: '#EDEEF8' },
  '租約':     { icon: '🏠', color: '#534AB7', bg: '#EDEEF8' },
  '貨商':     { icon: '📦', color: '#1D9E75', bg: '#E6F6F1' },
  '行政':     { icon: '📋', color: '#5F5E5A', bg: '#F1EFE8' },
  '雜費':     { icon: '🍜', color: '#888780', bg: '#F1EFE8' },
  '文具雜支': { icon: '✏️', color: '#888780', bg: '#F1EFE8' },
}
function catMeta(c: string | null) {
  return (c && CAT_META[c]) || { icon: '💰', color: '#888780', bg: '#F1EFE8' }
}

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
  reimbursed: boolean
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
    reimbursed: false,
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
  const [reimbursedFilter, setReimbursedFilter] = useState<'all' | 'yes' | 'no'>('all')
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
      reimbursed: form.reimbursed,
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
      reimbursed: e.reimbursed ?? false,
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
      已請款: e.reimbursed ? '是' : '否',
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
    const rmbOk = reimbursedFilter === 'all' || (reimbursedFilter === 'yes' ? e.reimbursed : !e.reimbursed)
    return catOk && statOk && rmbOk
  })

  const totalAll = expenses.reduce((s, e) => s + e.total, 0)
  const totalPaid = expenses.filter(e => e.pay_status === 'paid').reduce((s, e) => s + e.total, 0)
  const totalPending = expenses.filter(e => e.pay_status === 'pending').reduce((s, e) => s + e.total, 0)
  const totalTax = expenses.reduce((s, e) => s + (e.tax_amount ?? 0), 0)
  const totalUnreimbursed = expenses.filter(e => !e.reimbursed).reduce((s, e) => s + e.total, 0)
  const filteredTotal = filtered.reduce((s, e) => s + e.total, 0)

  // 花費分布(依類別),由大到小
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      const k = e.category || '未分類'
      acc[k] = (acc[k] ?? 0) + e.total
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const inputCls = 'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent'
  const labelCls = 'text-xs font-medium text-gray-600'

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">費用記錄</h1>
            <p className="text-sm text-gray-400 mt-0.5">共 {expenses.length} 筆費用</p>
          </div>
          <div className="flex gap-2 pt-1">
            {expenses.length > 0 && (
              <button onClick={exportExcel}
                className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                匯出 Excel
              </button>
            )}
            <button onClick={openAdd}
              className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              + 新增費用
            </button>
          </div>
        </div>

        {/* KPI summary */}
        {expenses.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="lp-card p-4 min-w-0">
              <p className="text-xs text-gray-500 mb-1.5">總費用</p>
              <p className="text-xl font-bold text-gray-900 truncate">NT$ {totalAll.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1.5 truncate">{expenses.length} 筆{totalTax > 0 ? ` · 稅外加 ${totalTax.toLocaleString()}` : ''}</p>
            </div>
            <div className="lp-card p-4 min-w-0">
              <p className="text-xs text-gray-500 mb-1.5">已付清</p>
              <p className="text-xl font-bold text-brand-teal truncate">NT$ {totalPaid.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1.5 truncate">{totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0}% 已支付</p>
            </div>
            <div className="lp-card p-4 min-w-0">
              <p className="text-xs text-gray-500 mb-1.5">未付款</p>
              <p className="text-xl font-bold text-gray-700 truncate">NT$ {totalPending.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1.5 truncate">待付款項</p>
            </div>
            <div className="lp-card p-4 min-w-0">
              <p className="text-xs text-gray-500 mb-1.5">未請款</p>
              <p className="text-xl font-bold text-accent truncate">NT$ {totalUnreimbursed.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-1.5 truncate">尚未向公司請款</p>
            </div>
          </div>
        )}

        {/* 錢花在哪 — 花費分布 */}
        {expenses.length > 0 && byCategory.length > 0 && (
          <div className="lp-card p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">錢花在哪</span>
              <span className="text-xs text-gray-400">共 {byCategory.length} 類</span>
            </div>
            <div className="space-y-2.5">
              {byCategory.slice(0, 6).map(([cat, amount]) => {
                const pct = totalAll > 0 ? Math.round((amount / totalAll) * 100) : 0
                const meta = catMeta(cat === '未分類' ? null : cat)
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{meta.icon} {cat}</span>
                      <span className="text-gray-900 font-medium">NT$ {amount.toLocaleString()} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filter bar */}
        {expenses.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {/* Category dropdown */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="all">所有類別</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Status tabs */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              {([['all', '全部'], ['paid', '已付清'], ['partial', '部分付款'], ['pending', '未付款']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val as PayStatusFilter)}
                  className={`px-3 py-2 text-sm transition-colors ${statusFilter === val ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Reimbursed tabs */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              {([['all', '全部請款'], ['no', '未請款'], ['yes', '已請款']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setReimbursedFilter(val)}
                  className={`px-3 py-2 text-sm transition-colors ${reimbursedFilter === val ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {expenses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-tint flex items-center justify-center text-accent">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6M9.5 9h.01M14.5 13h.01M6 3h12a1 1 0 011 1v16l-2-1.5L15 20l-2-1.5L11 20l-2-1.5L7 20l-2-1.5V4a1 1 0 011-1z" /></svg>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">還沒有費用記錄</p>
            <p className="text-sm text-gray-400">每一筆建置花費都記下來，預算與請款一目了然</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-base font-medium text-gray-500">沒有符合篩選條件的記錄</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(exp => {
              const isExpanded = expandedId === exp.id
              const meta = catMeta(exp.category)
              return (
                <div key={exp.id} className="lp-card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                    className={`w-full flex items-center gap-3 p-3 sm:p-3.5 text-left transition-colors ${isExpanded ? 'bg-accent-tint/40' : 'hover:bg-gray-50'}`}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: meta.bg }}>{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{exp.name}</p>
                      <p className="text-xs text-gray-400 truncate">{[exp.vendor, exp.pay_method, exp.date.slice(5)].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-semibold text-gray-900 whitespace-nowrap">NT$ {exp.total.toLocaleString()}</p>
                      <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${PAY_BADGE[exp.pay_status]}`}>{PAY_STATUS_LABEL[exp.pay_status]}</span>
                    </div>
                    {exp.photos?.length > 0 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={exp.photos[0]} alt="收據" onClick={e => { e.stopPropagation(); setLightbox(exp.photos[0]) }}
                        className="w-11 h-11 rounded-lg object-cover shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity" />
                    )}
                    <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 pb-4 pt-1 border-t border-gray-100">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mt-3">
                        {exp.category && <div><p className="text-xs text-gray-400 mb-0.5">類別</p><p className="font-medium text-gray-700">{exp.category}</p></div>}
                        {exp.deposit_amount != null && <div><p className="text-xs text-gray-400 mb-0.5">訂金</p><p className="font-medium text-gray-700">NT$ {exp.deposit_amount.toLocaleString()}{exp.deposit_date ? ` · ${exp.deposit_date}` : ''}</p></div>}
                        {exp.deposit_amount != null && <div><p className="text-xs text-gray-400 mb-0.5">尾款</p><p className="font-medium text-gray-700">NT$ {(exp.balance_amount ?? 0).toLocaleString()}{exp.balance_date ? ` · ${exp.balance_date}` : ''}</p></div>}
                        {exp.pay_date && <div><p className="text-xs text-gray-400 mb-0.5">付款日期</p><p className="font-medium text-gray-700">{exp.pay_date}</p></div>}
                        {exp.invoice_no && <div><p className="text-xs text-gray-400 mb-0.5">發票號碼</p><p className="font-medium text-gray-700">{exp.invoice_no}</p></div>}
                        {exp.tax_amount != null && exp.tax_amount > 0 && <div><p className="text-xs text-accent mb-0.5 font-semibold">稅外加</p><p className="font-semibold text-accent">NT$ {exp.tax_amount.toLocaleString()}</p></div>}
                        {exp.note && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-gray-400 mb-0.5">備註</p><p className="text-gray-700 whitespace-pre-wrap">{exp.note}</p></div>}
                      </div>
                      {exp.photos?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-1.5">收據 / 照片</p>
                          <div className="flex flex-wrap gap-2">
                            {exp.photos.map(url => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={url} src={url} alt="收據" onClick={() => setLightbox(url)}
                                className="w-16 h-16 rounded-xl object-cover cursor-zoom-in hover:opacity-80 transition-opacity" />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => supabase.from('expenses').update({ reimbursed: !exp.reimbursed }).eq('id', exp.id).then(() => load())}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${exp.reimbursed ? 'bg-brand-teal-tint text-brand-teal' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {exp.reimbursed ? '✓ 已向公司請款' : '標記為已請款'}
                        </button>
                        <div className="ml-auto flex gap-1">
                          <button onClick={() => startEdit(exp)} className="text-xs text-accent hover:opacity-70 px-2 py-1 font-medium">編輯</button>
                          <button onClick={() => setDeleteConfirm(exp.id)} className="text-xs text-brand-red hover:opacity-70 px-2 py-1 font-medium">刪除</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      {form.deposit_amount ? (
                        <div className="flex items-center gap-1">
                          <input type="date" className={`${inputCls} flex-1`}
                            value={form.deposit_date} onChange={e => setForm(f => ({ ...f, deposit_date: e.target.value }))} />
                          {form.deposit_date && (
                            <button type="button" onClick={() => setForm(f => ({ ...f, deposit_date: '' }))}
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm mt-1">✕</button>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-gray-300 py-2.5">請先填寫訂金金額</p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>尾款金額</label>
                      <input type="number" className={inputCls} placeholder="0"
                        value={form.balance_amount} onChange={e => setForm(f => ({ ...f, balance_amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>尾款日期</label>
                      {form.balance_amount ? (
                        <div className="flex items-center gap-1">
                          <input type="date" className={`${inputCls} flex-1`}
                            value={form.balance_date} onChange={e => setForm(f => ({ ...f, balance_date: e.target.value }))} />
                          {form.balance_date && (
                            <button type="button" onClick={() => setForm(f => ({ ...f, balance_date: '' }))}
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm mt-1">✕</button>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-gray-300 py-2.5">請先填寫尾款金額</p>
                      )}
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
                      <input type="number" className={`${inputCls} border-amber-200 focus:ring-accent`} placeholder="例：1050（5% 稅額）"
                        value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>備註</label>
                      <textarea rows={2} className={`${inputCls} resize-none`}
                        value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-3 cursor-pointer select-none mt-1">
                        <div
                          onClick={() => setForm(f => ({ ...f, reimbursed: !f.reimbursed }))}
                          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.reimbursed ? 'bg-purple-600' : 'bg-gray-200'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.reimbursed ? 'translate-x-5' : ''}`} />
                        </div>
                        <span className={`text-sm font-medium ${form.reimbursed ? 'text-purple-700' : 'text-gray-500'}`}>
                          {form.reimbursed ? '已向公司請款' : '尚未向公司請款'}
                        </span>
                      </label>
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
                  className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
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
