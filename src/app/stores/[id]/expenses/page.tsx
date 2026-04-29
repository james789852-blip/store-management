'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Expense } from '@/types'

const PAYMENT_METHODS = ['現金', '轉帳', '信用卡', '匯款']
const INVOICE_TYPES = ['估價單', '收據', '發票', '其他']
const PAYMENT_STAGES = ['訂金', '工程款', '尾款', '全額']

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    item: '',
    vendor: '',
    buyer: '',
    quantity: '1',
    amount: '',
    payment_stage: '',
    payment_method: '現金',
    payment_status: '未結清' as const,
    invoice_type: '收據' as const,
    notes: '',
  }
}

export default function ExpensesPage() {
  const { id } = useParams<{ id: string }>()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('expenses').select('*').eq('store_id', id).order('date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.item || !form.amount) return
    setSaving(true)

    let receipt_path = null
    let receipt_name = null

    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const path = `${id}/expenses/${Date.now()}.${ext}`
      await supabase.storage.from('receipts').upload(path, receiptFile)
      receipt_path = path
      receipt_name = receiptFile.name
    }

    const payload = {
      store_id: id,
      date: form.date,
      item: form.item,
      vendor: form.vendor || null,
      buyer: form.buyer || null,
      quantity: Number(form.quantity) || 1,
      amount: Number(form.amount),
      payment_stage: form.payment_stage || null,
      payment_method: form.payment_method || null,
      payment_status: form.payment_status,
      invoice_type: form.invoice_type || null,
      notes: form.notes || null,
      ...(receiptFile ? { receipt_path, receipt_name } : {}),
    }

    if (editId) {
      await supabase.from('expenses').update(payload).eq('id', editId)
    } else {
      await supabase.from('expenses').insert(payload)
    }

    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm())
    setReceiptFile(null)
    load()
  }

  async function deleteExpense(expId: string) {
    await supabase.from('expenses').delete().eq('id', expId)
    load()
  }

  async function exportExcel() {
    const { utils, writeFile } = await import('xlsx')
    const rows = expenses.map(e => ({
      日期: e.date,
      品項: e.item,
      廠商: e.vendor || '',
      購買人: e.buyer || '',
      數量: e.quantity,
      金額: e.amount,
      付款階段: e.payment_stage || '',
      付款方式: e.payment_method || '',
      結清狀態: e.payment_status,
      單據類型: e.invoice_type || '',
      備註: e.notes || '',
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '費用記錄')
    writeFile(wb, `費用記錄_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function startEdit(e: Expense) {
    setForm({
      date: e.date,
      item: e.item,
      vendor: e.vendor || '',
      buyer: e.buyer || '',
      quantity: String(e.quantity),
      amount: String(e.amount),
      payment_stage: e.payment_stage || '',
      payment_method: e.payment_method || '現金',
      payment_status: e.payment_status,
      invoice_type: (e.invoice_type as typeof form.invoice_type) || '收據',
      notes: e.notes || '',
    })
    setEditId(e.id)
    setShowAdd(true)
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const unpaid = expenses.filter(e => e.payment_status === '未結清').reduce((s, e) => s + e.amount, 0)

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">費用記錄</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            累計 NT$ {total.toLocaleString()}｜未結清 NT$ {unpaid.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {expenses.length > 0 && (
            <button onClick={exportExcel}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              匯出 Excel
            </button>
          )}
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm()); setReceiptFile(null) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增費用
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無費用記錄</p>
          <p className="text-sm">記錄每一筆建置費用，並可附上單據</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['日期', '品項', '廠商', '購買人', '金額', '付款階段', '方式', '結清', '單據', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map(exp => (
                  <tr key={exp.id} className="group hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{exp.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{exp.item}</td>
                    <td className="px-4 py-3 text-gray-500">{exp.vendor || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{exp.buyer || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">NT$ {exp.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{exp.payment_stage || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{exp.payment_method || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exp.payment_status === '已結清' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {exp.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {exp.receipt_path ? (
                        <a href="#" onClick={async (e) => {
                          e.preventDefault()
                          const { data } = await supabase.storage.from('receipts').createSignedUrl(exp.receipt_path!, 60)
                          if (data) window.open(data.signedUrl, '_blank')
                        }} className="text-xs text-blue-500 hover:underline">{exp.receipt_name || '附件'}</a>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button onClick={() => startEdit(exp)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                        <button onClick={() => deleteExpense(exp.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">合計</td>
                  <td className="px-4 py-3 font-bold text-gray-900">NT$ {total.toLocaleString()}</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯費用' : '新增費用'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">日期</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">品項 *</label>
                  <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} placeholder="例：廚房排煙設備" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">廠商</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">購買人</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.buyer} onChange={e => setForm(f => ({ ...f, buyer: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">金額 *</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">數量</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">付款階段</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.payment_stage} onChange={e => setForm(f => ({ ...f, payment_stage: e.target.value }))}>
                    <option value="">請選擇</option>
                    {PAYMENT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">付款方式</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">結清狀態</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value as typeof form.payment_status }))}>
                    <option value="未結清">未結清</option>
                    <option value="已結清">已結清</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">單據類型</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.invoice_type} onChange={e => setForm(f => ({ ...f, invoice_type: e.target.value as typeof form.invoice_type }))}>
                    {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">上傳收據 / 發票</label>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                <button onClick={() => fileRef.current?.click()}
                  className="mt-1 w-full border border-dashed border-gray-300 rounded-xl py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                  {receiptFile ? receiptFile.name : '點擊上傳（圖片或 PDF）'}
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowAdd(false); setEditId(null) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={save} disabled={!form.item || !form.amount || saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
