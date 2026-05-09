'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types'

type FormData = Partial<Omit<Store, 'id' | 'created_at' | 'updated_at'>>

type StoreStaff = {
  id: string
  store_id: string
  role: string
  name: string
  phone: string | null
  sort_order: number
}

type StaffDraft = { role: string; name: string; phone: string }

const FIELD_GROUPS = {
  basic: [
    { key: 'name', label: '店名', required: true },
    { key: 'tax_id', label: '統一編號' },
    { key: 'phone', label: '電話' },
    { key: 'address', label: '地址' },
    { key: 'sqft', label: '坪數', type: 'number' },
    { key: 'seats', label: '座位數', type: 'number' },
    { key: 'business_hours', label: '營業時間' },
    { key: 'monthly_rent', label: '月租金', type: 'number' },
    { key: 'deposit', label: '押金', type: 'number' },
    { key: 'open_date', label: '開幕日', type: 'date' },
    { key: 'lease_end_date', label: '租約到期日', type: 'date' },
    { key: 'bank_account', label: '銀行帳號' },
    { key: 'notes', label: '備註', textarea: true },
  ],
  accounts: [
    { key: 'wifi_ssid', label: 'Wi-Fi SSID' },
    { key: 'wifi_password', label: 'Wi-Fi 密碼', secret: true },
    { key: 'cctv_account', label: '監視器帳號' },
    { key: 'cctv_password', label: '監視器密碼', secret: true },
    { key: 'cctv_brand', label: '監視器品牌' },
    { key: 'pos_account', label: 'POS 帳號' },
    { key: 'pos_password', label: 'POS 密碼', secret: true },
    { key: 'pos_model', label: 'POS / 收銀機型號' },
  ],
  contacts: [
    { key: 'owner_name', label: '負責人姓名' },
    { key: 'owner_phone', label: '負責人電話' },
    { key: 'owner_id_number', label: '負責人身分證字號' },
    { key: 'landlord_name', label: '房東姓名' },
    { key: 'landlord_phone', label: '房東電話' },
  ],
}

const EMPTY_DRAFT: StaffDraft = { role: '', name: '', phone: '' }

export default function BasicPage() {
  const { id } = useParams<{ id: string }>()
  const [store, setStore] = useState<Store | null>(null)
  const [form, setForm] = useState<FormData>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'basic' | 'accounts' | 'contacts'>('basic')

  // staff state
  const [staff, setStaff] = useState<StoreStaff[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<StaffDraft>(EMPTY_DRAFT)
  const [adding, setAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<StaffDraft>(EMPTY_DRAFT)
  const [staffSaving, setStaffSaving] = useState(false)

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const { data } = await supabase.from('stores').select('*').eq('id', id).single()
    if (data) { setStore(data); setForm(data) }
    loadStaff()
  }

  async function loadStaff() {
    const { data } = await supabase
      .from('store_staff')
      .select('*')
      .eq('store_id', id)
      .order('sort_order')
      .order('created_at')
    setStaff(data ?? [])
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    await supabase.from('stores').update(form).eq('id', id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  function val(key: string) {
    return (form as Record<string, unknown>)[key] ?? ''
  }

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value === '' ? null : value }))
  }

  function startEdit(s: StoreStaff) {
    setEditingId(s.id)
    setEditDraft({ role: s.role, name: s.name, phone: s.phone ?? '' })
  }

  async function saveEdit() {
    if (!editingId || !editDraft.name) return
    setStaffSaving(true)
    await supabase.from('store_staff').update({
      role: editDraft.role,
      name: editDraft.name,
      phone: editDraft.phone || null,
    }).eq('id', editingId)
    setStaffSaving(false)
    setEditingId(null)
    loadStaff()
  }

  async function deleteStaff(staffId: string) {
    await supabase.from('store_staff').delete().eq('id', staffId)
    loadStaff()
  }

  async function addStaff() {
    if (!addDraft.name) return
    setStaffSaving(true)
    await supabase.from('store_staff').insert({
      store_id: id,
      role: addDraft.role,
      name: addDraft.name,
      phone: addDraft.phone || null,
      sort_order: staff.length,
    })
    setStaffSaving(false)
    setAdding(false)
    setAddDraft(EMPTY_DRAFT)
    loadStaff()
  }

  const TABS = [
    { key: 'basic' as const, label: '基本資料' },
    { key: 'accounts' as const, label: '帳號密碼' },
    { key: 'contacts' as const, label: '聯絡人' },
  ]

  const fields = FIELD_GROUPS[activeTab]

  return (
    <div className="bg-gray-50 min-h-full p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">基本資料</h1>
            <p className="text-sm text-gray-400 mt-0.5">{store?.name}</p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit mb-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(field => {
              const isSecret = 'secret' in field && field.secret
              const isRevealed = revealed[field.key]
              const isTextarea = 'textarea' in field && field.textarea
              const fieldVal = String(val(field.key))

              return (
                <div key={field.key} className={isTextarea ? 'sm:col-span-2' : ''}>
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    {'required' in field && field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <div className="relative mt-1">
                    {isTextarea ? (
                      <textarea
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={fieldVal}
                        onChange={e => set(field.key, e.target.value)}
                      />
                    ) : (
                      <input
                        type={isSecret && !isRevealed ? 'password' : ('type' in field ? field.type as string : 'text')}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                        value={fieldVal}
                        onChange={e => set(field.key, e.target.value)}
                      />
                    )}
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => setRevealed(r => ({ ...r, [field.key]: !r[field.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700"
                      >
                        {isRevealed ? '隱藏' : '顯示'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Staff section — only shown on basic tab */}
          {activeTab === 'basic' && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">店內人員</span>
                <button
                  onClick={() => { setAdding(true); setAddDraft(EMPTY_DRAFT) }}
                  className="text-xs px-3 py-1 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + 新增人員
                </button>
              </div>

              <div className="space-y-2">
                {staff.map(s => (
                  <div key={s.id} className="rounded-xl border border-gray-200 px-4 py-3">
                    {editingId === s.id ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          placeholder="職稱（如：店長）"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editDraft.role}
                          onChange={e => setEditDraft(d => ({ ...d, role: e.target.value }))}
                        />
                        <input
                          placeholder="姓名*"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editDraft.name}
                          onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                        />
                        <input
                          placeholder="電話"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editDraft.phone}
                          onChange={e => setEditDraft(d => ({ ...d, phone: e.target.value }))}
                        />
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={saveEdit}
                            disabled={staffSaving || !editDraft.name}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            儲存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-800 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          {s.role && (
                            <span className="shrink-0 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                              {s.role}
                            </span>
                          )}
                          <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                          {s.phone && (
                            <span className="text-sm text-gray-500 truncate">{s.phone}</span>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => startEdit(s)}
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => deleteStaff(s.id)}
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {adding && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        placeholder="職稱（如：店長）"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={addDraft.role}
                        onChange={e => setAddDraft(d => ({ ...d, role: e.target.value }))}
                        autoFocus
                      />
                      <input
                        placeholder="姓名*"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={addDraft.name}
                        onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))}
                      />
                      <input
                        placeholder="電話"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={addDraft.phone}
                        onChange={e => setAddDraft(d => ({ ...d, phone: e.target.value }))}
                      />
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={addStaff}
                          disabled={staffSaving || !addDraft.name}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          新增
                        </button>
                        <button
                          onClick={() => { setAdding(false); setAddDraft(EMPTY_DRAFT) }}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-800 transition-colors bg-white"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {staff.length === 0 && !adding && (
                  <p className="text-sm text-gray-400 py-2">尚無人員，點擊「新增人員」開始建立</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
