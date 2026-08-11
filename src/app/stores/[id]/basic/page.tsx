'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types'
import { STORE_STATUS_LABEL } from '@/types'
import FileUploader from '@/components/FileUploader'
import StaffList from '@/components/StaffList'
import PaymentList from '@/components/PaymentList'
import CredentialList from '@/components/CredentialList'

type FormData = Partial<Omit<Store, 'id' | 'created_at' | 'updated_at'>>

type Field = { key: string; label: string; type?: string; textarea?: boolean; required?: boolean }
type IconKey = 'store' | 'money' | 'bank' | 'pos' | 'wifi' | 'cctv' | 'owner' | 'landlord' | 'note'
type Section = { title: string; hint?: string; icon: IconKey; tone: Tone; fields: Field[] }
type TabKey = 'basic' | 'accounts' | 'contacts'
type Tone = 'teal' | 'amber' | 'blue' | 'red' | 'gray'

const TONE: Record<Tone, { bg: string; fg: string }> = {
  teal: { bg: '#E4F5EE', fg: '#1D9E75' },
  amber: { bg: '#FBF1E1', fg: '#E0912A' },
  blue: { bg: '#E3EEF8', fg: '#185FA5' },
  red: { bg: '#FBE9E9', fg: '#D94F4F' },
  gray: { bg: '#F1F2F4', fg: '#6B7280' },
}

const ICON_PATH: Record<IconKey, string> = {
  store: 'M3 9l1.6-4.2A1 1 0 015.5 4h13a1 1 0 01.9.8L21 9M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M4 9h16M9.5 20v-5h5v5',
  money: 'M12 7c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V5m0 10v2m0-11c1.1 0 2 .4 2.6 1M12 15c-1.1 0-2-.4-2.6-1',
  bank: 'M3 21h18M4 21V10l8-5 8 5v11M9 21v-6h6v6',
  pos: 'M4 5h16v10H4zM8 19h8M12 15v4',
  wifi: 'M4.5 11.5a11 11 0 0115 0M7.5 14.5a6.5 6.5 0 019 0M12 18h.01',
  cctv: 'M15 10l4.6-2.3a1 1 0 011.4.9v6.8a1 1 0 01-1.4.9L15 14M5 8h8a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z',
  owner: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0',
  landlord: 'M3 12l9-8 9 8M5 10v10h14V10',
  note: 'M9 12h6m-6 4h4M6 3h9l4 4v14H6z',
}

function Icon({ k, tone }: { k: IconKey; tone: Tone }) {
  const t = TONE[tone]
  return (
    <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.bg }}>
      <svg className="w-5 h-5" fill="none" stroke={t.fg} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATH[k]} />
      </svg>
    </span>
  )
}

const BASIC_SECTIONS: Section[] = [
  { title: '店面基本', icon: 'store', tone: 'teal', fields: [
    { key: 'name', label: '店名', required: true },
    { key: 'tax_id', label: '統一編號' },
    { key: 'phone', label: '電話' },
    { key: 'address', label: '地址' },
    { key: 'sqft', label: '坪數', type: 'number' },
    { key: 'seats', label: '座位數', type: 'number' },
    { key: 'business_hours', label: '營業時間' },
  ] },
  { title: '租約與財務', icon: 'money', tone: 'amber', fields: [
    { key: 'monthly_rent', label: '月租金', type: 'number' },
    { key: 'deposit', label: '押金', type: 'number' },
    { key: 'open_date', label: '開幕日', type: 'date' },
    { key: 'sign_date', label: '簽約日', type: 'date' },
    { key: 'lease_end_date', label: '租約到期日', type: 'date' },
  ] },
]

const CONTACT_SECTIONS: Section[] = [
  { title: '房東', icon: 'landlord', tone: 'gray', fields: [
    { key: 'landlord_name', label: '房東姓名' },
    { key: 'landlord_phone', label: '房東電話' },
  ] },
]

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '基本資料' },
  { key: 'accounts', label: '帳密 · POS · 支付' },
  { key: 'contacts', label: '聯絡窗口' },
]

// 各分頁完整度用的欄位（帳密頁改用 store_credentials,以筆數計）
const TAB_FIELDS: Record<'basic' | 'contacts', string[]> = {
  basic: ['name', 'tax_id', 'phone', 'address', 'sqft', 'seats', 'business_hours', 'monthly_rent', 'deposit', 'open_date', 'sign_date', 'lease_end_date', 'bank_name', 'bank_branch', 'bank_account', 'bankbook_photo'],
  contacts: ['owner_name', 'owner_phone', 'owner_id_number', 'owner_id_front', 'owner_id_back', 'landlord_name', 'landlord_phone'],
}
const ALL_KEYS = [...TAB_FIELDS.basic, ...TAB_FIELDS.contacts]

function isFilled(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== ''
}

// 解析「11:00 - 21:00」成 [開店, 打烊],給 time 輸入用
function parseHours(v: string): [string, string] {
  const parts = v.split(/\s*[-–~～]\s*/)
  const norm = (t: string) => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})/)
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
  }
  return [norm(parts[0] || ''), norm(parts[1] || '')]
}

export default function BasicPage() {
  const { id } = useParams<{ id: string }>()
  const [store, setStore] = useState<Store | null>(null)
  const [form, setForm] = useState<FormData>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('basic')
  const [credCount, setCredCount] = useState(0)

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const [{ data }, { data: creds }] = await Promise.all([
      supabase.from('stores').select('*').eq('id', id).single(),
      supabase.from('store_credentials').select('value').eq('store_id', id),
    ])
    if (data) { setStore(data); setForm(data) }
    setCredCount((creds || []).filter((c: { value: string | null }) => c.value && c.value.trim()).length)
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

  const rec = form as Record<string, unknown>
  const countFilled = (keys: string[]) => keys.filter(k => isFilled(rec[k])).length
  const filledCount = countFilled(ALL_KEYS)
  const overallPct = Math.round((filledCount / ALL_KEYS.length) * 100)

  // hero 重點標籤
  const heroChips: { icon: string; text: string }[] = []
  if (isFilled(rec.sqft)) heroChips.push({ icon: '⬚', text: `${rec.sqft} 坪` })
  if (isFilled(rec.seats)) heroChips.push({ icon: '🪑', text: `${rec.seats} 席` })
  if (isFilled(rec.business_hours)) heroChips.push({ icon: '🕒', text: String(rec.business_hours) })
  if (isFilled(rec.phone)) heroChips.push({ icon: '☎', text: String(rec.phone) })

  function renderField(field: Field) {
    const fieldVal = String(val(field.key))
    const filled = isFilled((form as Record<string, unknown>)[field.key])
    const flag = field.required
      ? <span className="text-brand-red">*</span>
      : filled
        ? <span className="w-1.5 h-1.5 rounded-full bg-brand-teal inline-block" />
        : <span className="text-[10px] text-gray-300">未填</span>

    // 營業時間:兩個時間選擇器
    if (field.key === 'business_hours') {
      const [openT, closeT] = parseHours(fieldVal)
      const update = (o: string, c: string) => set('business_hours', [o, c].filter(Boolean).join(' - '))
      return (
        <div key={field.key}>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">營業時間 {flag}</label>
          <div className="mt-1 flex items-center gap-2">
            <input type="time" value={openT} onChange={e => update(e.target.value, closeT)}
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            <span className="text-gray-400 shrink-0">～</span>
            <input type="time" value={closeT} onChange={e => update(openT, e.target.value)}
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
        </div>
      )
    }

    return (
      <div key={field.key} className={field.textarea ? 'sm:col-span-2' : ''}>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">{field.label} {!field.textarea && flag}</label>
        <div className="mt-1">
          {field.textarea ? (
            <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              value={fieldVal} onChange={e => set(field.key, e.target.value)} />
          ) : (
            <input type={field.type ?? 'text'} className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${filled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50/60'}`}
              value={fieldVal} onChange={e => set(field.key, e.target.value)} />
          )}
        </div>
      </div>
    )
  }

  function renderSection(section: Section) {
    const done = section.fields.filter(f => isFilled(rec[f.key])).length
    return (
      <div key={section.title} className="lp-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Icon k={section.icon} tone={section.tone} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
            {section.hint && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{section.hint}</p>}
          </div>
          <span className="ml-auto text-[11px] text-gray-400 shrink-0">{done}/{section.fields.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

  const initial = (store?.name || form.name || '?').trim().charAt(0)
  const statusLabel = store ? STORE_STATUS_LABEL[store.status] : ''
  const C = 2 * Math.PI * 26

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">

        {/* 店面資料卡 Hero */}
        <div className="lp-card overflow-hidden mb-5">
          <div className="p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, #FBF1E1 0%, #FFFFFF 60%)' }}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-white shadow-sm border border-accent/20 flex items-center justify-center text-2xl font-bold text-accent">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{form.name || '未命名店面'}</h1>
                  {statusLabel && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-accent border border-accent/20">{statusLabel}</span>}
                </div>
                {isFilled(rec.address) && <p className="text-sm text-gray-500 mt-1 truncate">📍 {String(rec.address)}</p>}
                {heroChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {heroChips.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-700 bg-white/70 border border-gray-200/70 rounded-full px-2.5 py-1">
                        <span className="opacity-70">{c.icon}</span>{c.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* 完整度圓環 */}
              <div className="shrink-0 relative w-[68px] h-[68px]">
                <svg className="w-[68px] h-[68px] -rotate-90" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="26" fill="none" stroke="#EAEAEA" strokeWidth="6" />
                  <circle cx="30" cy="30" r="26" fill="none" stroke={overallPct === 100 ? '#1D9E75' : '#E0912A'} strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - overallPct / 100)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-bold text-gray-900 leading-none">{overallPct}%</span>
                  <span className="text-[9px] text-gray-400 mt-0.5">完整度</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">已填 {filledCount} / {ALL_KEYS.length} 項關鍵資料</span>
            <button onClick={save} disabled={saving} className="lp-btn-primary px-5 py-2 text-sm">
              {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-full sm:w-fit mb-5 overflow-x-auto">
          {TABS.map(t => {
            const active = activeTab === t.key
            const isAcc = t.key === 'accounts'
            const done = isAcc ? credCount : countFilled(TAB_FIELDS[t.key as 'basic' | 'contacts'])
            const total = isAcc ? 0 : TAB_FIELDS[t.key as 'basic' | 'contacts'].length
            const badge = isAcc ? `${credCount} 筆` : `${done}/${total}`
            const complete = isAcc ? credCount > 0 : done === total
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : complete ? 'bg-brand-teal-tint text-brand-teal' : 'bg-gray-100 text-gray-400'}`}>{badge}</span>
              </button>
            )
          })}
        </div>

        {/* 基本資料 */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {BASIC_SECTIONS.map(renderSection)}
            <div className="lp-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <Icon k="bank" tone="blue" />
                <h3 className="text-sm font-semibold text-gray-800">銀行帳戶</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {renderField({ key: 'bank_name', label: '銀行' })}
                {renderField({ key: 'bank_branch', label: '分行' })}
                {renderField({ key: 'bank_account', label: '帳號' })}
              </div>
              {photoField('存摺照片', 'bankbook_photo')}
            </div>
            <div className="lp-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <Icon k="note" tone="gray" />
                <h3 className="text-sm font-semibold text-gray-800">備註</h3>
              </div>
              {renderField({ key: 'notes', label: '備註', textarea: true })}
            </div>
          </div>
        )}

        {/* 帳密 · POS · 支付 */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <CredentialList storeId={id} onCountChange={setCredCount} />
            <PaymentList storeId={id} />
          </div>
        )}

        {/* 聯絡窗口 */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <div className="lp-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <Icon k="owner" tone="amber" />
                <h3 className="text-sm font-semibold text-gray-800">負責人</h3>
              </div>
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
