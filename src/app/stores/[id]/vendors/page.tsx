'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Vendor } from '@/types'

const CATEGORY_OPTIONS = ['水電', '木工', '泥作', '設備', '設計', '招牌', '印刷', '清潔', '其他']
const PAY_METHOD_OPTIONS = ['現金', '轉帳', '支票']

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  '水電': { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  '木工': { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  '泥作': { bg: 'bg-stone-100',  text: 'text-stone-700'  },
  '設備': { bg: 'bg-purple-100', text: 'text-purple-700' },
  '設計': { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  '招牌': { bg: 'bg-orange-100', text: 'text-orange-700' },
  '印刷': { bg: 'bg-teal-100',   text: 'text-teal-700'   },
  '清潔': { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
}

function avatarColor(category: string | null) {
  return category && AVATAR_COLORS[category]
    ? AVATAR_COLORS[category]
    : { bg: 'bg-gray-100', text: 'text-gray-600' }
}

function lineUrl(lineId: string) {
  return `https://line.me/ti/p/~${encodeURIComponent(lineId)}`
}

type VendorForm = {
  name: string
  category: string
  service: string
  contact_name: string
  phone: string
  mobile: string
  email: string
  address: string
  tax_id: string
  line_id: string
  pay_method: string
  bank_name: string
  bank_account: string
  can_invoice: boolean
  invoice_note: string
  note: string
}

function emptyForm(): VendorForm {
  return {
    name: '',
    category: '',
    service: '',
    contact_name: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    tax_id: '',
    line_id: '',
    pay_method: '',
    bank_name: '',
    bank_account: '',
    can_invoice: false,
    invoice_note: '',
    note: '',
  }
}

function vendorToForm(v: Vendor): VendorForm {
  return {
    name: v.name,
    category: v.category || '',
    service: v.service || '',
    contact_name: v.contact_name || '',
    phone: v.phone || '',
    mobile: v.mobile || '',
    email: v.email || '',
    address: v.address || '',
    tax_id: v.tax_id || '',
    line_id: v.line_id || '',
    pay_method: v.pay_method || '',
    bank_name: v.bank_name || '',
    bank_account: v.bank_account || '',
    can_invoice: v.can_invoice,
    invoice_note: v.invoice_note || '',
    note: v.note || '',
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full border-b border-gray-100 pb-1 mb-1">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{children}</span>
    </div>
  )
}

function Field({
  label,
  children,
  half,
}: {
  label: string
  children: React.ReactNode
  half?: boolean
}) {
  return (
    <div className={half ? '' : 'col-span-full md:col-span-1'}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function VendorsPage() {
  const { id } = useParams<{ id: string }>()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('全部')
  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<VendorForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('store_id', id)
      .order('category')
      .order('name')
    setVendors(data || [])
    setLoading(false)
  }

  const categories = ['全部', ...Array.from(new Set(vendors.map(v => v.category).filter(Boolean) as string[]))]

  const filtered =
    categoryFilter === '全部' ? vendors : vendors.filter(v => v.category === categoryFilter)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      store_id: id,
      name: form.name.trim(),
      category: form.category || null,
      service: form.service || null,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      mobile: form.mobile || null,
      email: form.email || null,
      address: form.address || null,
      tax_id: form.tax_id || null,
      line_id: form.line_id || null,
      pay_method: form.pay_method || null,
      bank_name: form.bank_name || null,
      bank_account: form.bank_account || null,
      can_invoice: form.can_invoice,
      invoice_note: form.invoice_note || null,
      note: form.note || null,
    }
    if (editId) {
      await supabase.from('vendors').update(payload).eq('id', editId)
    } else {
      await supabase.from('vendors').insert(payload)
    }
    setSaving(false)
    closeForm()
    load()
  }

  async function handleDelete() {
    if (!editId) return
    await supabase.from('vendors').delete().eq('id', editId)
    setDeleteConfirm(false)
    closeForm()
    load()
  }

  function openAdd() {
    setForm(emptyForm())
    setEditId(null)
    setDeleteConfirm(false)
    setShowForm(true)
  }

  function openEdit(v: Vendor) {
    setForm(vendorToForm(v))
    setEditId(v.id)
    setDeleteConfirm(false)
    setDetailVendor(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setDeleteConfirm(false)
  }

  function setField<K extends keyof VendorForm>(key: K, value: VendorForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function copyPhone(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // fallback silently
    }
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = vendors.map(v => ({
      廠商名稱: v.name,
      類別: v.category || '',
      服務項目: v.service || '',
      聯絡人: v.contact_name || '',
      電話: v.phone || '',
      手機: v.mobile || '',
      Email: v.email || '',
      LINE: v.line_id || '',
      地址: v.address || '',
      統一編號: v.tax_id || '',
      付款方式: v.pay_method || '',
      銀行: v.bank_name || '',
      帳號: v.bank_account || '',
      可開發票: v.can_invoice ? '是' : '否',
      備註: v.note || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '廠商資料')
    XLSX.writeFile(wb, `廠商資料_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">廠商資料</h1>
            <p className="text-sm text-gray-400 mt-0.5">共 {vendors.length} 間廠商</p>
          </div>
          <div className="flex gap-2">
            {vendors.length > 0 && (
              <button
                onClick={exportExcel}
                className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                匯出 Excel
              </button>
            )}
            <button
              onClick={openAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              + 新增廠商
            </button>
          </div>
        </div>

        {/* Category filter tabs */}
        {vendors.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Vendor grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600 mb-1">尚無廠商資料</p>
            <p className="text-sm">建立廠商資料庫，方便日後聯絡</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(v => {
              const { bg, text } = avatarColor(v.category)
              return (
                <div
                  key={v.id}
                  onClick={() => setDetailVendor(v)}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col"
                >
                  {/* Card header: avatar + name + category */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${bg} ${text}`}>
                      {v.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-base leading-tight truncate">{v.name}</h3>
                      {v.category && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${bg} ${text}`}>
                          {v.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {v.service && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">{v.service}</p>
                  )}

                  {(v.contact_name || v.phone || v.mobile) && (
                    <p className="text-xs text-gray-500 mb-2 truncate">
                      {[v.contact_name, v.phone || v.mobile].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {/* Quick actions */}
                  {(v.phone || v.mobile || v.line_id || v.can_invoice) && (
                    <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-gray-50"
                      onClick={e => e.stopPropagation()}
                    >
                      {(v.phone || v.mobile) && (
                        <a
                          href={`tel:${v.phone || v.mobile}`}
                          className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {v.phone || v.mobile}
                        </a>
                      )}
                      {v.line_id && (
                        <a
                          href={lineUrl(v.line_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-white bg-green-500 hover:bg-green-600 px-2.5 py-1 rounded-full transition-colors"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.365 9.89c.50 0 .906.41.906.91s-.406.91-.906.91H17.71v1.11h1.655c.5 0 .906.41.906.91s-.406.91-.906.91H16.8c-.5 0-.906-.41-.906-.91V9.89c0-.5.406-.91.906-.91h2.565zm-5.584 0c.5 0 .906.41.906.91v3.85c0 .5-.406.91-.906.91s-.906-.41-.906-.91V9.89c0-.5.406-.91.906-.91zm-2.184.91v2.94l-1.946-3.51c-.16-.29-.464-.34-.72-.25a.91.91 0 00-.546.83v3.85c0 .5.406.91.906.91s.906-.41.906-.91v-2.94l1.946 3.51c.16.29.464.34.72.25a.91.91 0 00.546-.83V9.89c0-.5-.406-.91-.906-.91s-.906.41-.906.91zM6.56 9.89c-.5 0-.906.41-.906.91s.406.91.906.91H8.21v1.11H6.56c-.5 0-.906.41-.906.91s.406.91.906.91h2.564c.5 0 .906-.41.906-.91V9.89c0-.5-.406-.91-.906-.91H6.56z"/>
                            <path d="M12 2C6.486 2 2 5.822 2 10.5c0 2.967 1.762 5.582 4.434 7.15L5.5 22l4.766-2.496A11.34 11.34 0 0012 19c5.514 0 10-3.822 10-8.5S17.514 2 12 2z"/>
                          </svg>
                          LINE
                        </a>
                      )}
                      {v.can_invoice && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">可發票</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailVendor && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setDetailVendor(null) }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${avatarColor(detailVendor.category).bg} ${avatarColor(detailVendor.category).text}`}>
                  {detailVendor.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{detailVendor.name}</h2>
                  {detailVendor.category && (
                    <span className={`mt-0.5 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${avatarColor(detailVendor.category).bg} ${avatarColor(detailVendor.category).text}`}>
                      {detailVendor.category}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {detailVendor.line_id && (
                  <a
                    href={lineUrl(detailVendor.line_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.486 2 2 5.822 2 10.5c0 2.967 1.762 5.582 4.434 7.15L5.5 22l4.766-2.496A11.34 11.34 0 0012 19c5.514 0 10-3.822 10-8.5S17.514 2 12 2z"/>
                    </svg>
                    LINE
                  </a>
                )}
                {(detailVendor.phone || detailVendor.mobile) && (
                  <a
                    href={`tel:${detailVendor.phone || detailVendor.mobile}`}
                    className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    撥打
                  </a>
                )}
                <button
                  onClick={() => openEdit(detailVendor)}
                  className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  編輯
                </button>
                <button
                  onClick={() => setDetailVendor(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {detailVendor.service && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">服務項目</p>
                  <p className="text-sm text-gray-700">{detailVendor.service}</p>
                </div>
              )}

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">聯絡資訊</p>
                <dl className="space-y-2">
                  {detailVendor.contact_name && <DetailRow label="聯絡人" value={detailVendor.contact_name} />}
                  {detailVendor.phone && (
                    <DetailRow
                      label="電話"
                      value={detailVendor.phone}
                      onCopy={() => copyPhone(detailVendor.phone!)}
                      copied={copied === detailVendor.phone}
                    />
                  )}
                  {detailVendor.mobile && (
                    <DetailRow
                      label="手機"
                      value={detailVendor.mobile}
                      onCopy={() => copyPhone(detailVendor.mobile!)}
                      copied={copied === detailVendor.mobile}
                    />
                  )}
                  {detailVendor.email && <DetailRow label="Email" value={detailVendor.email} />}
                  {detailVendor.line_id && <DetailRow label="LINE ID" value={detailVendor.line_id} />}
                  {detailVendor.address && <DetailRow label="地址" value={detailVendor.address} />}
                  {detailVendor.tax_id && <DetailRow label="統一編號" value={detailVendor.tax_id} />}
                </dl>
              </div>

              {/* Payment */}
              {(detailVendor.pay_method || detailVendor.bank_name || detailVendor.bank_account || detailVendor.can_invoice) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">付款資訊</p>
                  <dl className="space-y-2">
                    {detailVendor.pay_method && <DetailRow label="付款方式" value={detailVendor.pay_method} />}
                    {detailVendor.bank_name && <DetailRow label="銀行" value={detailVendor.bank_name} />}
                    {detailVendor.bank_account && <DetailRow label="帳號" value={detailVendor.bank_account} />}
                    <div className="flex items-center gap-2">
                      <dt className="text-xs text-gray-400 w-20 flex-shrink-0">可開發票</dt>
                      <dd>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${detailVendor.can_invoice ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                          {detailVendor.can_invoice ? '是' : '否'}
                        </span>
                      </dd>
                    </div>
                    {detailVendor.invoice_note && <DetailRow label="發票備註" value={detailVendor.invoice_note} />}
                  </dl>
                </div>
              )}

              {/* Note */}
              {detailVendor.note && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">備註</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{detailVendor.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) closeForm() }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{editId ? '編輯廠商' : '新增廠商'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Section 1: 基本資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">基本資訊</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">廠商名稱 <span className="text-red-500">*</span></label>
                    <input
                      autoFocus
                      className={inputCls}
                      value={form.name}
                      onChange={e => setField('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
                    <input
                      className={inputCls}
                      list="category-list"
                      value={form.category}
                      onChange={e => setField('category', e.target.value)}
                      placeholder="選擇或輸入"
                    />
                    <datalist id="category-list">
                      {CATEGORY_OPTIONS.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">服務項目</label>
                    <input
                      className={inputCls}
                      value={form.service}
                      onChange={e => setField('service', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: 聯絡資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">聯絡資訊</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">聯絡人</label>
                    <input className={inputCls} value={form.contact_name} onChange={e => setField('contact_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
                    <input className={inputCls} type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">手機</label>
                    <input className={inputCls} type="tel" value={form.mobile} onChange={e => setField('mobile', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input className={inputCls} type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LINE ID</label>
                    <input className={inputCls} value={form.line_id} onChange={e => setField('line_id', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">統一編號</label>
                    <input className={inputCls} value={form.tax_id} onChange={e => setField('tax_id', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                    <input className={inputCls} value={form.address} onChange={e => setField('address', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Section 3: 付款資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">付款資訊</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">付款方式</label>
                    <input
                      className={inputCls}
                      list="pay-method-list"
                      value={form.pay_method}
                      onChange={e => setField('pay_method', e.target.value)}
                      placeholder="選擇或輸入"
                    />
                    <datalist id="pay-method-list">
                      {PAY_METHOD_OPTIONS.map(m => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">銀行名稱</label>
                    <input className={inputCls} value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">銀行帳號</label>
                    <input className={inputCls} value={form.bank_account} onChange={e => setField('bank_account', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <input
                      id="can-invoice"
                      type="checkbox"
                      className="w-4 h-4 rounded accent-blue-600"
                      checked={form.can_invoice}
                      onChange={e => setField('can_invoice', e.target.checked)}
                    />
                    <label htmlFor="can-invoice" className="text-sm font-medium text-gray-700 cursor-pointer">可開發票</label>
                  </div>
                  {form.can_invoice && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">發票備註</label>
                      <input className={inputCls} value={form.invoice_note} onChange={e => setField('invoice_note', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: 備註 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">備註</p>
                <textarea
                  rows={3}
                  className={`${inputCls} resize-none`}
                  value={form.note}
                  onChange={e => setField('note', e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <div>
                {editId && !deleteConfirm && (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="text-sm text-red-400 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    刪除廠商
                  </button>
                )}
                {deleteConfirm && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">確定刪除？</span>
                    <button
                      onClick={handleDelete}
                      className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-xl hover:bg-red-700 transition-colors"
                    >
                      確定
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="text-sm text-gray-500 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeForm}
                  className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={!form.name.trim() || saving}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Detail row helper ────────────────────────────────────────────
function DetailRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string
  value: string
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <dt className="text-xs text-gray-400 w-20 flex-shrink-0 pt-0.5">{label}</dt>
      <dd className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-sm text-gray-700 break-all">{value}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-blue-600 px-1.5 py-0.5 rounded-md hover:bg-blue-50 transition-colors"
          >
            {copied ? '已複製' : '複製'}
          </button>
        )}
      </dd>
    </div>
  )
}
