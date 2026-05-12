'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types'

type FormData = Partial<Omit<Store, 'id' | 'created_at' | 'updated_at'>>

interface StoreContact {
  id: string
  name: string
  phone: string | null
  line_id: string | null
  sort_order: number
}

type ContactDraft = { name: string; phone: string; line_id: string }
const EMPTY_CONTACT: ContactDraft = { name: '', phone: '', line_id: '' }

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
    { key: 'wifi_password', label: 'Wi-Fi 密碼' },
    { key: 'cctv_ip', label: '監視器 IP / 域名' },
    { key: 'cctv_port', label: '監視器 HTTP 埠' },
    { key: 'cctv_nickname', label: '監視器設備暱稱' },
    { key: 'cctv_account', label: '監視器使用者名稱' },
    { key: 'cctv_password', label: '監視器密碼', secret: true },
    { key: 'pos_account', label: 'POS 帳號' },
    { key: 'pos_password', label: 'POS 密碼', secret: true },
  ],
  contacts: [
    { key: 'owner_name', label: '負責人姓名' },
    { key: 'owner_phone', label: '負責人電話' },
    { key: 'owner_id_number', label: '負責人身分證字號' },
    { key: 'landlord_name', label: '房東姓名' },
    { key: 'landlord_phone', label: '房東電話' },
  ],
}

export default function BasicPage() {
  const { id } = useParams<{ id: string }>()
  const [store, setStore] = useState<Store | null>(null)
  const [form, setForm] = useState<FormData>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'basic' | 'accounts' | 'contacts'>('basic')

  // contacts state
  const [contacts, setContacts] = useState<StoreContact[]>([])
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ContactDraft>(EMPTY_CONTACT)
  const [adding, setAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<ContactDraft>(EMPTY_CONTACT)
  const [contactSaving, setContactSaving] = useState(false)

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const [{ data: storeData }, { data: contactsData }] = await Promise.all([
      supabase.from('stores').select('*').eq('id', id).single(),
      supabase.from('store_contacts').select('id, name, phone, line_id, sort_order').eq('store_id', id).order('sort_order'),
    ])
    if (storeData) { setStore(storeData); setForm(storeData) }
    setContacts((contactsData || []) as StoreContact[])
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

  // ── contacts CRUD ──────────────────────────────────────────────────────────

  function startEdit(c: StoreContact) {
    setEditingContactId(c.id)
    setEditDraft({ name: c.name, phone: c.phone ?? '', line_id: c.line_id ?? '' })
  }

  async function saveEdit() {
    if (!editingContactId || !editDraft.name.trim()) return
    setContactSaving(true)
    await supabase.from('store_contacts')
      .update({ name: editDraft.name, phone: editDraft.phone || null, line_id: editDraft.line_id || null })
      .eq('id', editingContactId)
    setContactSaving(false)
    setEditingContactId(null)
    load()
  }

  async function deleteContact(contactId: string) {
    if (!confirm('確定要刪除這位聯絡人？')) return
    await supabase.from('store_contacts').delete().eq('id', contactId)
    setContacts(prev => prev.filter(c => c.id !== contactId))
  }

  async function addContact() {
    if (!addDraft.name.trim()) return
    setContactSaving(true)
    const { data, error } = await supabase
      .from('store_contacts')
      .insert({ store_id: id, name: addDraft.name, phone: addDraft.phone || null, line_id: addDraft.line_id || null, sort_order: contacts.length })
      .select()
      .single()
    setContactSaving(false)
    if (error || !data) { alert('新增失敗：' + (error?.message ?? '請再試一次')); return }
    setContacts(prev => [...prev, data as StoreContact])
    setAdding(false)
    setAddDraft(EMPTY_CONTACT)
  }

  const TABS = [
    { key: 'basic' as const, label: '基本資料' },
    { key: 'accounts' as const, label: '帳號密碼' },
    { key: 'contacts' as const, label: '聯絡人' },
  ]

  const fields = FIELD_GROUPS[activeTab]

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">基本資料</h1>
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

          {/* 其他聯絡人（contacts tab 限定） */}
          {activeTab === 'contacts' && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">其他聯絡人</h3>
                {!adding && (
                  <button
                    onClick={() => { setAdding(true); setAddDraft(EMPTY_CONTACT) }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ＋ 新增
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {contacts.map(contact =>
                  editingContactId === contact.id ? (
                    <div key={contact.id} className="border border-blue-200 rounded-xl p-3 space-y-2 bg-blue-50/40">
                      <input className={inputCls} placeholder="姓名 *" autoFocus
                        value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
                      <input className={inputCls} placeholder="電話"
                        value={editDraft.phone} onChange={e => setEditDraft(d => ({ ...d, phone: e.target.value }))} />
                      <input className={inputCls} placeholder="LINE ID / 電話"
                        value={editDraft.line_id} onChange={e => setEditDraft(d => ({ ...d, line_id: e.target.value }))} />
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setEditingContactId(null)}
                          className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs hover:bg-gray-50 transition-colors">
                          取消
                        </button>
                        <button onClick={saveEdit} disabled={contactSaving || !editDraft.name.trim()}
                          className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
                          {contactSaving ? '儲存中...' : '儲存'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={contact.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                        {contact.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          {contact.phone && <span className="text-xs text-gray-500">📞 {contact.phone}</span>}
                          {contact.line_id && <span className="text-xs text-green-600">LINE {contact.line_id}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => startEdit(contact)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button onClick={() => deleteContact(contact.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                )}

                {contacts.length === 0 && !adding && (
                  <p className="text-sm text-gray-400 text-center py-4">尚無其他聯絡人</p>
                )}

                {/* 新增表單 */}
                {adding && (
                  <div className="border border-dashed border-blue-300 rounded-xl p-3 space-y-2 bg-blue-50/30">
                    <input className={inputCls} placeholder="姓名 *" autoFocus
                      value={addDraft.name} onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))} />
                    <input className={inputCls} placeholder="電話"
                      value={addDraft.phone} onChange={e => setAddDraft(d => ({ ...d, phone: e.target.value }))} />
                    <input className={inputCls} placeholder="LINE ID / 電話"
                      value={addDraft.line_id} onChange={e => setAddDraft(d => ({ ...d, line_id: e.target.value }))} />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => { setAdding(false); setAddDraft(EMPTY_CONTACT) }}
                        className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs hover:bg-gray-50 transition-colors">
                        取消
                      </button>
                      <button onClick={addContact} disabled={contactSaving || !addDraft.name.trim()}
                        className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
                        {contactSaving ? '新增中...' : '新增'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
