'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Vendor } from '@/types'

const CATEGORIES = ['裝潢工程', '水電', '空調', '設備', '家具', '食材', '包裝', '廣告招牌', '清潔', '其他']
const PAYMENT_METHODS = ['現金', '轉帳', '月結', '其他']

function emptyForm() {
  return { name: '', category: CATEGORIES[0], contact_name: '', phone: '', payment_method: '轉帳', notes: '' }
}

export default function VendorsPage() {
  const { id } = useParams<{ id: string }>()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('vendors').select('*').eq('store_id', id).order('category').order('name')
    setVendors(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = {
      store_id: id,
      name: form.name,
      category: form.category || null,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('vendors').update(payload).eq('id', editId)
    } else {
      await supabase.from('vendors').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm())
    load()
  }

  async function deleteVendor(vendorId: string) {
    await supabase.from('vendors').delete().eq('id', vendorId)
    load()
  }

  function startEdit(v: Vendor) {
    setForm({
      name: v.name,
      category: v.category || CATEGORIES[0],
      contact_name: v.contact_name || '',
      phone: v.phone || '',
      payment_method: v.payment_method || '轉帳',
      notes: v.notes || '',
    })
    setEditId(v.id)
    setShowAdd(true)
  }

  const filtered = vendors.filter(v =>
    v.name.includes(search) ||
    (v.contact_name || '').includes(search) ||
    (v.phone || '').includes(search)
  )

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">廠商資料</h1>
          <p className="text-sm text-gray-400 mt-0.5">共 {vendors.length} 間廠商</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm()) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + 新增廠商
        </button>
      </div>

      {vendors.length > 0 && (
        <input
          className="mb-6 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="搜尋廠商名稱、聯絡人..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">{search ? '沒有符合的廠商' : '尚無廠商資料'}</p>
          {!search && <p className="text-sm">建立廠商資料庫，方便日後聯絡</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-200 p-5 group hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{v.name}</h3>
                  {v.category && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{v.category}</span>}
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button onClick={() => startEdit(v)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                  <button onClick={() => deleteVendor(v.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                </div>
              </div>
              <dl className="space-y-1.5">
                {v.contact_name && (
                  <div className="flex items-center gap-2">
                    <dt className="text-xs text-gray-400 w-14">聯絡人</dt>
                    <dd className="text-sm text-gray-700">{v.contact_name}</dd>
                  </div>
                )}
                {v.phone && (
                  <div className="flex items-center gap-2">
                    <dt className="text-xs text-gray-400 w-14">電話</dt>
                    <dd className="text-sm text-gray-700">
                      <a href={`tel:${v.phone}`} className="hover:text-blue-600">{v.phone}</a>
                    </dd>
                  </div>
                )}
                {v.payment_method && (
                  <div className="flex items-center gap-2">
                    <dt className="text-xs text-gray-400 w-14">付款</dt>
                    <dd className="text-sm text-gray-700">{v.payment_method}</dd>
                  </div>
                )}
                {v.notes && (
                  <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-50">
                    <dt className="text-xs text-gray-400 w-14 flex-shrink-0">備註</dt>
                    <dd className="text-xs text-gray-500">{v.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯廠商' : '新增廠商'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">廠商名稱 *</label>
                <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">類別</label>
                <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">聯絡人</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">電話</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">付款方式</label>
                <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <textarea rows={2} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowAdd(false); setEditId(null) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={save} disabled={!form.name || saving}
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
