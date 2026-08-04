'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types'
import FileUploader from '@/components/FileUploader'
import StaffList from '@/components/StaffList'
import PaymentList from '@/components/PaymentList'

type FormData = Partial<Omit<Store, 'id' | 'created_at' | 'updated_at'>>

type Field = { key: string; label: string; type?: string; textarea?: boolean; required?: boolean }
type Section = { title: string; hint?: string; fields: Field[] }
type TabKey = 'basic' | 'accounts' | 'contacts'

const BASIC_SECTIONS: Section[] = [
  { title: '店面基本', fields: [
    { key: 'name', label: '店名', required: true },
    { key: 'tax_id', label: '統一編號' },
    { key: 'phone', label: '電話' },
    { key: 'address', label: '地址' },
    { key: 'sqft', label: '坪數', type: 'number' },
    { key: 'seats', label: '座位數', type: 'number' },
    { key: 'business_hours', label: '營業時間' },
  ] },
  { title: '租約與財務', fields: [
    { key: 'monthly_rent', label: '月租金', type: 'number' },
    { key: 'deposit', label: '押金', type: 'number' },
    { key: 'open_date', label: '開幕日', type: 'date' },
    { key: 'lease_end_date', label: '租約到期日', type: 'date' },
  ] },
]

const POS_SECTIONS: Section[] = [
  { title: 'POS 系統', hint: '不同店可用不同系統（iChef / 肚肚 / 柿子紅…）', fields: [
    { key: 'pos_system', label: 'POS 系統名稱' },
    { key: 'pos_front_account', label: '前台帳號' },
    { key: 'pos_front_password', label: '前台密碼' },
    { key: 'pos_back_account', label: '後台帳號' },
    { key: 'pos_back_password', label: '後台密碼' },
    { key: 'printer_model', label: '出單機型號' },
  ] },
  { title: '網路', fields: [
    { key: 'wifi_model', label: 'Wi-Fi 機型' },
    { key: 'wifi_ssid', label: 'Wi-Fi SSID' },
    { key: 'wifi_password', label: 'Wi-Fi 密碼' },
  ] },
  { title: '監視系統', fields: [
    { key: 'cctv_brand', label: '監視器品牌' },
    { key: 'cctv_ip', label: '監視器 IP / 域名' },
    { key: 'cctv_port', label: '監視器 HTTP 埠' },
    { key: 'cctv_nickname', label: '設備暱稱' },
    { key: 'cctv_account', label: '使用者名稱' },
    { key: 'cctv_password', label: '監視器密碼' },
  ] },
  { title: '發票機', fields: [
    { key: 'invoice_machine', label: '電子發票機' },
  ] },
]

const CONTACT_SECTIONS: Section[] = [
  { title: '房東', fields: [
    { key: 'landlord_name', label: '房東姓名' },
    { key: 'landlord_phone', label: '房東電話' },
  ] },
  { title: '緊急聯絡', fields: [
    { key: 'emergency_name', label: '緊急聯絡人' },
    { key: 'emergency_phone', label: '緊急聯絡電話' },
  ] },
]

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '基本資料' },
  { key: 'accounts', label: '帳密 · POS · 支付' },
  { key: 'contacts', label: '聯絡窗口' },
]

// 完整度計算用的關鍵欄位
const KEY_FIELDS = [
  'name', 'tax_id', 'phone', 'address', 'sqft', 'business_hours',
  'monthly_rent', 'open_date', 'lease_end_date', 'bank_name', 'bank_account',
  'pos_system', 'wifi_ssid', 'invoice_machine', 'owner_name', 'landlord_name', 'emergency_name',
]

function isFilled(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== ''
}

export default function BasicPage() {
  const { id } = useParams<{ id: string }>()
  const [store, setStore] = useState<Store | null>(null)
  const [form, setForm] = useState<FormData>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('basic')

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const { data } = await supabase.from('stores').select('*').eq('id', id).single()
    if (data) { setStore(data); setForm(data) }
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

  function val(key: string) { return (form as Record<string, unknown>)[key] ?? '' }
  function set(key: string, value: unknown) { setForm(f => ({ ...f, [key]: value === '' ? null : value })) }

  const filledCount = KEY_FIELDS.filter(k => isFilled((form as Record<string, unknown>)[k])).length
  const overallPct = Math.round((filledCount / KEY_FIELDS.length) * 100)

  function renderField(field: Field) {
    const fieldVal = String(val(field.key))
    const filled = isFilled((form as Record<string, unknown>)[field.key])
    return (
      <div key={field.key} className={field.textarea ? 'sm:col-span-2' : ''}>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-brand-red">*</span>}
          {!field.required && !field.textarea && !filled && <span className="text-[10px] text-gray-300">未填</span>}
        </label>
        <div className="mt-1">
          {field.textarea ? (
            <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              value={fieldVal} onChange={e => set(field.key, e.target.value)} />
          ) : (
            <input type={field.type ?? 'text'} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              value={fieldVal} onChange={e => set(field.key, e.target.value)} />
          )}
        </div>
      </div>
    )
  }

  function renderSection(section: Section) {
    return (
      <div key={section.title} className="lp-card p-5">
        <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
        {section.hint && <p className="text-[11px] text-gray-400 mt-0.5 mb-3">{section.hint}</p>}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${section.hint ? '' : 'mt-4'}`}>
          {section.fields.map(renderField)}
        </div>
      </div>
    )
  }

  function photoField(label: string, key: string) {
    const cur = String(val(key))
    return (
      <div>
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1.5">
          <FileUploader
            folderPath={`${id}/basic`}
            value={cur ? [cur] : []}
            onChange={urls => set(key, urls[0] || null)}
            multiple={false}
            accept="image/*"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">基本資料</h1>
            <p className="text-sm text-gray-400 mt-0.5">{store?.name}</p>
          </div>
          <button onClick={save} disabled={saving} className="lp-btn-primary px-5 py-2 text-sm">
            {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
          </button>
        </div>

        {/* Completeness */}
        <div className="lp-card p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800">關鍵資料完整度</span>
            <span className={`text-sm font-semibold ${overallPct === 100 ? 'text-brand-teal' : 'text-gray-600'}`}>{filledCount} / {KEY_FIELDS.length}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${overallPct === 100 ? 'bg-brand-teal' : 'bg-accent'}`} style={{ width: `${overallPct}%` }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-full sm:w-fit mb-5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 基本資料 */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {BASIC_SECTIONS.map(renderSection)}
            <div className="lp-card p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">銀行帳戶</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {renderField({ key: 'bank_name', label: '銀行' })}
                {renderField({ key: 'bank_branch', label: '分行' })}
                {renderField({ key: 'bank_account', label: '帳號' })}
              </div>
              {photoField('存摺照片', 'bankbook_photo')}
            </div>
            {renderSection({ title: '備註', fields: [{ key: 'notes', label: '備註', textarea: true }] })}
          </div>
        )}

        {/* 帳密 · POS · 支付 */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            {POS_SECTIONS.map(renderSection)}
            <PaymentList storeId={id} />
          </div>
        )}

        {/* 聯絡窗口 */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <div className="lp-card p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">負責人</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {renderField({ key: 'owner_name', label: '負責人姓名' })}
                {renderField({ key: 'owner_phone', label: '負責人電話' })}
                {renderField({ key: 'owner_id_number', label: '身分證字號' })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {photoField('身分證正面', 'owner_id_front')}
                {photoField('身分證反面', 'owner_id_back')}
              </div>
            </div>

            <StaffList storeId={id} />

            {CONTACT_SECTIONS.map(renderSection)}
          </div>
        )}
      </div>
    </div>
  )
}
