'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { differenceInDays, differenceInMonths } from 'date-fns'
import {
  STORE_STATUS_LABEL, SCHEDULE_STATUS_LABEL, LOG_STATUS_LABEL,
  type Store, type StoreStatus, type ScheduleStatus, type LogStatus,
} from '@/types'
import { STORE_STATUS_BADGE, SCHEDULE_BADGE, LOG_BADGE, STORE_STATUS_DOT } from '@/lib/colors'

// ── Local types ───────────────────────────────────────────────

interface OvSchedule {
  id: string
  task_name: string
  vendor: string | null
  start_date: string | null
  end_date: string | null
  status: ScheduleStatus
}

interface OvTodo {
  id: string
  title: string
  due_date: string | null
  priority: string
}

interface OvLog {
  id: string
  date: string
  task_name: string | null
  vendor: string | null
  status: LogStatus
  progress: string | null
  issue: string | null
  photos: string[]
}

// 上傳圖片到 store-files，回傳公開網址
async function uploadToStore(storeId: string, file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${storeId}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('store-files').upload(path, file, { upsert: true })
  if (error) return null
  return supabase.storage.from('store-files').getPublicUrl(path).data.publicUrl
}

// ── Helpers ───────────────────────────────────────────────────

function parseLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function todayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// 大額金額縮寫（台式：萬 / 億）
function fmtMoneyShort(n: number): string {
  if (n >= 1e8) return `NT$ ${(n / 1e8).toFixed(2)} 億`
  if (n >= 1e4) return `NT$ ${(n / 1e4).toFixed(n >= 1e6 ? 0 : 1)} 萬`
  return `NT$ ${n.toLocaleString()}`
}

// 百分比：去除浮點誤差，最多一位小數
function fmtPct(n: number): string {
  return String(Math.round(n * 10) / 10)
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function todoTimeLabel(dueDate: string | null, today: string): { text: string; cls: string } {
  if (!dueDate) return { text: '', cls: '' }
  const diff = differenceInDays(parseLocal(dueDate), parseLocal(today))
  if (diff < 0)  return { text: `逾期 ${Math.abs(diff)} 天`, cls: 'text-brand-red font-semibold' }
  if (diff === 0) return { text: '今日截止', cls: 'text-accent font-semibold' }
  if (diff === 1) return { text: '明日截止', cls: 'text-accent font-medium' }
  if (diff <= 7)  return { text: `還有 ${diff} 天`, cls: 'text-gray-500 font-medium' }
  return { text: dueDate, cls: 'text-gray-400' }
}

function scheduleTimeLabel(s: OvSchedule, today: string): string {
  if (s.status === 'overdue' && s.end_date) {
    const d = differenceInDays(parseLocal(today), parseLocal(s.end_date))
    return `逾期 ${Math.max(0, d)} 天`
  }
  if (s.status === 'ongoing' && s.end_date) {
    const d = differenceInDays(parseLocal(s.end_date), parseLocal(today))
    return d >= 0 ? `剩 ${d} 天完工` : `逾期 ${Math.abs(d)} 天`
  }
  if (s.status === 'pending' && s.start_date) {
    const d = differenceInDays(parseLocal(s.start_date), parseLocal(today))
    return d >= 0 ? `${d} 天後開始` : ''
  }
  return ''
}

// 店面資料護照:建一間店該保留的關鍵資訊完成度
function buildPassport(s: Store | null): { label: string; filled: boolean; href: string }[] {
  if (!s) return []
  const has = (...vals: (string | number | null | undefined)[]) =>
    vals.some(v => v !== null && v !== undefined && String(v).trim() !== '')
  return [
    { label: '租約到期', filled: has(s.lease_end_date), href: 'basic' },
    { label: '統一編號', filled: has(s.tax_id), href: 'basic' },
    { label: '營業時間', filled: has(s.business_hours), href: 'basic' },
    { label: 'WiFi', filled: has(s.wifi_ssid), href: 'basic' },
    { label: 'POS 帳密', filled: has(s.pos_account, s.pos_password), href: 'basic' },
    { label: '發票機', filled: has(s.invoice_machine), href: 'basic' },
    { label: '監視器密碼', filled: has(s.cctv_password), href: 'basic' },
    { label: '房東窗口', filled: has(s.landlord_name, s.landlord_phone), href: 'basic' },
    { label: '店長', filled: has(s.manager_name), href: 'basic' },
    { label: '緊急聯絡', filled: has(s.emergency_name, s.emergency_phone), href: 'basic' },
    { label: '水電/瓦斯窗口', filled: has(s.electric_vendor, s.gas_vendor), href: 'basic' },
    { label: '銀行帳戶', filled: has(s.bank_account), href: 'basic' },
  ]
}

// ── Skeleton ──────────────────────────────────────────────────

function Skel({ cls = '' }: { cls?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${cls}`} />
}

// ── Input helpers ─────────────────────────────────────────────

const inputCls = 'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent'
const labelCls = 'block text-sm font-medium text-gray-700'

// ── Section card ──────────────────────────────────────────────

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="lp-card p-5">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs text-accent hover:opacity-70 font-medium inline-flex items-center gap-0.5">
      {children}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>()
  const today = todayStr()

  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [schedules, setSchedules] = useState<OvSchedule[]>([])
  const [todos, setTodos] = useState<OvTodo[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [totalInvPct, setTotalInvPct] = useState(0)
  const [totalInvAmount, setTotalInvAmount] = useState(0)
  const [targetInvPct, setTargetInvPct] = useState(30)
  const [logs, setLogs] = useState<OvLog[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Store>>({})
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingSite, setUploadingSite] = useState(false)
  const [photoView, setPhotoView] = useState<number | null>(null)

  useEffect(() => { loadAll() }, [id]) // eslint-disable-line

  async function loadAll() {
    setLoading(true)
    const [
      { data: storeData },
      { data: schData },
      { data: todoData },
      { data: expData },
      { data: invData },
      { data: logData },
      { data: budgetData },
    ] = await Promise.all([
      supabase.from('stores').select('*').eq('id', id).single(),
      supabase.from('build_schedules')
        .select('id, task_name, vendor, start_date, end_date, status')
        .eq('store_id', id)
        .order('start_date', { ascending: true }),
      supabase.from('todos')
        .select('id, title, due_date, priority')
        .eq('store_id', id)
        .eq('done', false)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('expenses')
        .select('total, pay_status, deposit_amount')
        .eq('store_id', id),
      supabase.from('investors')
        .select('percentage, amount')
        .eq('store_id', id),
      supabase.from('construction_logs')
        .select('id, date, task_name, vendor, status, progress, issue, photos')
        .eq('store_id', id)
        .order('date', { ascending: false })
        .limit(12),
      supabase.from('budget_settings')
        .select('investor_percentage')
        .eq('store_id', id)
        .single(),
    ])

    if (storeData) { setStore(storeData as Store); setForm(storeData as Store) }
    setSchedules((schData || []) as OvSchedule[])
    setTodos((todoData || []) as OvTodo[])

    const paid = (expData || []).filter(e => e.pay_status === 'paid').reduce((s, e) => s + (e.total ?? 0), 0)
    const partial = (expData || []).filter(e => e.pay_status === 'partial').reduce((s, e) => s + (e.deposit_amount ?? 0), 0)
    setTotalExpenses(paid + partial)

    setTotalInvPct((invData || []).reduce((s, i) => s + (i.percentage ?? 0), 0))
    setTotalInvAmount((invData || []).reduce((s, i) => s + (i.amount ?? 0), 0))
    if (budgetData?.investor_percentage) setTargetInvPct(budgetData.investor_percentage)

    setLogs((logData || []) as OvLog[])
    setLoading(false)
  }

  async function saveStore() {
    if (!form.name) return
    setSaving(true)
    await supabase.from('stores').update({
      name: form.name,
      status: form.status,
      address: form.address || null,
      phone: form.phone || null,
      sqft: form.sqft ?? null,
      monthly_rent: form.monthly_rent ?? null,
      deposit: form.deposit ?? null,
      open_date: form.open_date || null,
      lease_end_date: form.lease_end_date || null,
      business_hours: form.business_hours || null,
      seats: form.seats ?? null,
      wifi_ssid: form.wifi_ssid || null,
      wifi_password: form.wifi_password || null,
      notes: form.notes || null,
    }).eq('id', id)
    setSaving(false)
    setEditing(false)
    loadAll()
  }

  async function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingCover(true)
    const url = await uploadToStore(id, file, 'cover')
    if (url) { await supabase.from('stores').update({ cover_photo: url }).eq('id', id); await loadAll() }
    setUploadingCover(false)
  }

  async function onSitePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingSite(true)
    const url = await uploadToStore(id, file, 'log')
    if (url) {
      await supabase.from('construction_logs').insert({ store_id: id, date: today, status: 'normal', photos: [url] })
      await loadAll()
    }
    setUploadingSite(false)
  }

  // ── Computed ──────────────────────────────────────────────────

  const overdueTodos = todos.filter(t => t.due_date && t.due_date < today)
  const overdueSchs  = schedules.filter(s => s.status === 'overdue')

  const schDone  = schedules.filter(s => s.status === 'done').length
  const schTotal = schedules.length
  const schPct   = schTotal > 0 ? Math.round((schDone / schTotal) * 100) : 0

  const daysToOpen = store?.open_date ? differenceInDays(parseLocal(store.open_date), parseLocal(today)) : null
  const monthsOpen = daysToOpen !== null && daysToOpen < 0 && store?.open_date
    ? differenceInMonths(parseLocal(today), parseLocal(store.open_date))
    : null

  const remainInvPct = Math.round(Math.max(0, targetInvPct - totalInvPct) * 10) / 10
  const invPctOfTarget = targetInvPct > 0 ? Math.min(100, Math.round((totalInvPct / targetInvPct) * 100)) : 0

  const budgetTotal = store?.total_budget ?? null
  const expensePct = budgetTotal && budgetTotal > 0 ? Math.round((totalExpenses / budgetTotal) * 100) : null

  const sortedTodos = [...todos].sort((a, b) => {
    const rank = (t: OvTodo) => t.due_date && t.due_date < today ? 0 : t.due_date === today ? 1 : 2
    const dr = rank(a) - rank(b)
    if (dr !== 0) return dr
    return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
  })

  const pendingSorted = schedules.filter(s => s.status === 'pending')
    .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))
  const activeStep = overdueSchs[0] || schedules.find(s => s.status === 'ongoing') || null
  const primaryStep = activeStep || pendingSorted[0] || null
  const secondaryStep = activeStep ? pendingSorted[0] : (pendingSorted[1] || null)

  const recentSchedules = [...schedules]
    .filter(s => s.status !== 'done')
    .sort((a, b) => {
      const rank: Record<string, number> = { overdue: 0, ongoing: 1, pending: 2 }
      const dr = (rank[a.status] ?? 3) - (rank[b.status] ?? 3)
      if (dr !== 0) return dr
      return (a.start_date ?? '').localeCompare(b.start_date ?? '')
    })
    .slice(0, 5)

  const passport = buildPassport(store)
  const passportFilled = passport.filter(p => p.filled).length

  const hasAlert = overdueTodos.length > 0 || overdueSchs.length > 0

  const photoFeed = logs
    .flatMap(l => (l.photos || []).map(url => ({ url, date: l.date, task: l.task_name })))
    .slice(0, 8)

  const warmCopy = store?.status === 'open'
    ? (monthsOpen ? `營運中 · 開幕滿 ${monthsOpen} 個月 🎉` : '正式營運中！')
    : daysToOpen === null
      ? `建置進度 ${schPct}%，一起把它蓋起來`
      : daysToOpen > 0
        ? `再 ${daysToOpen} 天就開幕，加油！`
        : '準備開幕中！'

  const stepStatusText: Record<ScheduleStatus, string> = {
    done: '已完成', ongoing: '進行中', overdue: '已逾期', pending: '待開始',
  }

  // ── Skeleton ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-full p-5 sm:p-8 space-y-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2"><Skel cls="h-8 w-52" /><Skel cls="h-4 w-72" /></div>
          <Skel cls="h-9 w-24" />
        </div>
        <Skel cls="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skel key={i} cls="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skel cls="h-56 rounded-2xl" /><Skel cls="h-56 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!store) return <div className="flex items-center justify-center py-32 text-gray-400">找不到店面</div>

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-gray-50 min-h-full p-5 sm:p-8 space-y-4">

        {/* ── Cover hero ── */}
        <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 156 }}>
          {store.cover_photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.cover_photo} alt={store.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#2A2926 0%,#4A4840 55%,#8A5A2B 100%)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.05) 60%)' }} />

          <div className="absolute top-3 right-3 flex gap-2">
            <label className="cursor-pointer bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full px-3 py-1.5 hover:bg-white/30 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={onCoverChange} />
              {uploadingCover ? '上傳中…' : store.cover_photo ? '換封面' : '加封面照片'}
            </label>
            <button onClick={() => { setForm(store); setEditing(true) }}
              className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full px-3 py-1.5 hover:bg-white/30 transition-colors">
              編輯
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${STORE_STATUS_BADGE[store.status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STORE_STATUS_DOT[store.status]}`} />
              {STORE_STATUS_LABEL[store.status]}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">{store.name}</h1>
            {store.address && <p className="text-xs text-white/80 mt-1">📍 {store.address}{store.sqft != null ? ` · ${store.sqft} 坪` : ''}</p>}
          </div>
        </div>

        {/* ── 進度環 + 溫度文案 ── */}
        {schTotal > 0 && (
          <div className="lp-card p-5 flex items-center gap-4">
            <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
              <svg viewBox="0 0 36 36" style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#EEEDE8" strokeWidth="4" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1D9E75" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray="97.4" strokeDashoffset={97.4 * (1 - schPct / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold text-gray-900">{schPct}%</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-gray-900">{warmCopy}</p>
              <p className="text-xs text-gray-500 mt-0.5">{schDone} / {schTotal} 工項完成{store.open_date ? ` · 預計 ${store.open_date} 開幕` : ''}</p>
            </div>
          </div>
        )}

        {/* ── 里程碑慶祝 ── */}
        {schTotal > 0 && schPct === 100 && store.status === 'building' && (
          <div className="rounded-2xl border border-brand-teal bg-brand-teal-tint px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-brand-teal">所有工項都完成了！</p>
              <p className="text-xs text-brand-teal/80 mt-0.5">辛苦了，接下來到「開幕確認」把最後一哩路走完吧。</p>
            </div>
            <Link href={`/stores/${id}/opening`} className="shrink-0 bg-brand-teal text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">開幕確認</Link>
          </div>
        )}

        {/* ── Alert (only if overdue) ── */}
        {hasAlert && (
          <Link href={`/stores/${id}/todos`} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-brand-red-tint bg-brand-red-tint/50 hover:bg-brand-red-tint transition-colors">
            <span className="w-6 h-6 rounded-full bg-brand-red flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold leading-none">!</span>
            </span>
            <p className="text-sm font-semibold text-brand-red flex-1">
              {[overdueSchs.length > 0 ? `${overdueSchs.length} 項逾期工程` : '', overdueTodos.length > 0 ? `${overdueTodos.length} 項逾期待辦` : ''].filter(Boolean).join('、')}，需要處理
            </p>
            <span className="text-xs text-brand-red font-medium shrink-0">前往 →</span>
          </Link>
        )}

        {/* ── 下一步引導卡 ── */}
        {primaryStep && (
          <div className="lp-card p-5" style={{ borderColor: 'var(--accent)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-accent text-white text-[11px] font-semibold rounded-md px-2 py-0.5">下一步</span>
              <span className="text-sm font-medium text-gray-900">目前該推進的工項</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 bg-accent-tint rounded-xl px-4 py-3">
                <p className="text-[11px] text-accent font-medium mb-0.5">
                  {stepStatusText[primaryStep.status]}{scheduleTimeLabel(primaryStep, today) ? ` · ${scheduleTimeLabel(primaryStep, today)}` : ''}
                </p>
                <p className="text-[15px] font-semibold text-gray-900">{primaryStep.task_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[primaryStep.vendor, primaryStep.start_date && primaryStep.end_date ? `${primaryStep.start_date} ~ ${primaryStep.end_date}` : ''].filter(Boolean).join(' · ') || '尚未排定日期'}
                </p>
              </div>
              {secondaryStep && (
                <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[11px] text-gray-400 font-medium mb-0.5">接著開始</p>
                  <p className="text-[15px] font-semibold text-gray-700">{secondaryStep.task_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{scheduleTimeLabel(secondaryStep, today) || (secondaryStep.start_date ? `${secondaryStep.start_date} 起` : '尚未排定')}</p>
                </div>
              )}
              <Link href={`/stores/${id}/schedule`} className="lp-btn-primary flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm sm:self-center whitespace-nowrap">
                去排程
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        )}

        {/* ── 現場動態(工地照片牆)── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800">📷 現場動態</span>
            <Link href={`/stores/${id}/log`} className="text-xs text-accent hover:opacity-70 font-medium">看施工日誌</Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {photoFeed.map((p, i) => (
              <button key={i} onClick={() => setPhotoView(i)} className="flex-none w-28 text-left">
                <div className="h-24 rounded-xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.task || '現場照片'} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1 truncate">{p.date.slice(5)}{p.task ? ` ${p.task}` : ''}</p>
              </button>
            ))}
            <label className="flex-none w-28 cursor-pointer">
              <div className="h-24 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-accent hover:text-accent transition-colors">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onSitePhoto} />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="text-[10px]">{uploadingSite ? '上傳中…' : '加今天的'}</span>
              </div>
            </label>
          </div>
        </div>

        {/* ── 關鍵數字列 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lp-card p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">建置進度</p>
            <p className="text-2xl font-bold text-gray-900 truncate">{schPct}<span className="text-sm font-semibold">%</span></p>
            <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-brand-teal rounded-full" style={{ width: `${schPct}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 truncate">{schDone} / {schTotal} 工項完成</p>
          </div>
          <div className="lp-card p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">距開幕</p>
            <p className="text-2xl font-bold text-gray-900 truncate">
              {daysToOpen === null ? '—' : daysToOpen >= 0 ? <>{daysToOpen}<span className="text-sm font-semibold"> 天</span></> : <span className="text-brand-teal">已開幕</span>}
            </p>
            <p className="text-[11px] text-gray-400 mt-3.5 truncate">{store.open_date ? `預計 ${store.open_date}` : '尚未設定開幕日'}</p>
          </div>
          <Link href={`/stores/${id}/expenses`} className="lp-card lp-card-hover p-4 block min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">累計費用</p>
            <p className="text-2xl font-bold text-gray-900 truncate">{fmtMoneyShort(totalExpenses)}</p>
            <p className="text-[11px] text-gray-400 mt-3.5 truncate">
              {budgetTotal ? `預算 ${fmtMoneyShort(budgetTotal)} · 用 ${expensePct}%` : '查看費用明細'}
            </p>
          </Link>
          <Link href={`/stores/${id}/investors`} className="lp-card lp-card-hover p-4 block min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">股東募資</p>
            <p className="text-2xl font-bold text-gray-900 truncate">{fmtPct(totalInvPct)}<span className="text-sm font-semibold">%</span> <span className="text-xs text-gray-400 font-medium">/ {fmtPct(targetInvPct)}%</span></p>
            <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${invPctOfTarget}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 truncate">{remainInvPct > 0 ? `尚缺 ${fmtPct(remainInvPct)}%` : '已達標'} · {fmtMoneyShort(totalInvAmount)}</p>
          </Link>
        </div>

        {/* ── 雙欄 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Left */}
          <div className="space-y-4">
            <SectionCard title="近期工項" action={<CardLink href={`/stores/${id}/schedule`}>查看排程</CardLink>}>
              {recentSchedules.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">尚無工項，<Link href={`/stores/${id}/schedule`} className="text-accent">套用標準流程</Link></p>
              ) : (
                <div className="space-y-2.5">
                  {recentSchedules.map(s => (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === 'ongoing' ? 'bg-brand-blue' : s.status === 'overdue' ? 'bg-brand-red' : 'bg-gray-300'}`} />
                      <span className="flex-1 text-sm text-gray-700 truncate">{s.task_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${SCHEDULE_BADGE[s.status]}`}>{SCHEDULE_STATUS_LABEL[s.status]}</span>
                      {scheduleTimeLabel(s, today) && <span className="text-[10px] text-gray-400 shrink-0 w-16 text-right">{scheduleTimeLabel(s, today)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="最近施工日誌" action={<CardLink href={`/stores/${id}/log`}>全部</CardLink>}>
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">尚無施工日誌</p>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => {
                    const content = log.progress || log.issue || ''
                    return (
                      <Link key={log.id} href={`/stores/${id}/log`} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="shrink-0 text-center" style={{ minWidth: 30 }}>
                          <p className="text-base font-bold text-gray-800 leading-none">{log.date.slice(8)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{log.date.slice(5, 7)}月</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{log.task_name || '施工日誌'}{log.vendor ? ` · ${log.vendor}` : ''}</p>
                          {content && <p className="text-xs text-gray-400 mt-0.5 truncate">{trunc(content, 40)}</p>}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${LOG_BADGE[log.status]}`}>{LOG_STATUS_LABEL[log.status]}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <SectionCard title="待辦事項" action={<CardLink href={`/stores/${id}/todos`}>全部</CardLink>}>
              {sortedTodos.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">目前沒有待辦</p>
              ) : (
                <div className="space-y-2.5">
                  {sortedTodos.slice(0, 5).map(t => {
                    const tl = todoTimeLabel(t.due_date, today)
                    return (
                      <div key={t.id} className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 border-[1.5px] border-gray-300 rounded shrink-0" />
                        <span className="flex-1 text-sm text-gray-700 truncate">{t.title}</span>
                        {tl.text && <span className={`text-[11px] shrink-0 ${tl.cls}`}>{tl.text}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>

            <div className="lp-card p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-gray-800">店面資料護照</h2>
                <span className={`text-xs font-semibold ${passportFilled === passport.length ? 'text-brand-teal' : 'text-gray-500'}`}>{passportFilled} / {passport.length} 完整</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">建店該保留的關鍵資訊，一眼看出還缺什麼</p>
              <div className="flex flex-wrap gap-1.5">
                {passport.map(p => (
                  <Link
                    key={p.label}
                    href={`/stores/${id}/${p.href}`}
                    className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2.5 py-1 transition-opacity hover:opacity-75 ${
                      p.filled ? 'bg-brand-teal-tint text-brand-teal' : 'bg-brand-red-tint text-brand-red'
                    }`}
                  >
                    {p.filled
                      ? <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      : <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v4M12 16h.01" /></svg>}
                    {p.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── Edit modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900 text-lg">編輯店面資料</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">基本資訊</p>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>店名 *</label>
                  <input className={inputCls} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>狀態</label>
                  <select className={inputCls} value={form.status ?? 'building'} onChange={e => setForm(f => ({ ...f, status: e.target.value as StoreStatus }))}>
                    {(Object.entries(STORE_STATUS_LABEL) as [StoreStatus, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>地址</label>
                <input className={inputCls} value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>電話</label>
                  <input className={inputCls} value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>座位數</label>
                  <input type="number" className={inputCls} value={form.seats ?? ''} onChange={e => setForm(f => ({ ...f, seats: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>坪數</label>
                  <input type="number" className={inputCls} value={form.sqft ?? ''} onChange={e => setForm(f => ({ ...f, sqft: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className={labelCls}>月租金</label>
                  <input type="number" className={inputCls} value={form.monthly_rent ?? ''} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className={labelCls}>押金</label>
                  <input type="number" className={inputCls} value={form.deposit ?? ''} onChange={e => setForm(f => ({ ...f, deposit: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">租約與營業</p>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>開幕日</label>
                  <input type="date" className={inputCls} value={form.open_date ?? ''} onChange={e => setForm(f => ({ ...f, open_date: e.target.value || null }))} />
                </div>
                <div>
                  <label className={labelCls}>租約到期日</label>
                  <input type="date" className={inputCls} value={form.lease_end_date ?? ''} onChange={e => setForm(f => ({ ...f, lease_end_date: e.target.value || null }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>營業時間</label>
                <input className={inputCls} placeholder="例：11:00–21:00" value={form.business_hours ?? ''} onChange={e => setForm(f => ({ ...f, business_hours: e.target.value }))} />
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Wi-Fi</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div>
                <label className={labelCls}>SSID</label>
                <input className={inputCls} value={form.wifi_ssid ?? ''} onChange={e => setForm(f => ({ ...f, wifi_ssid: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>密碼</label>
                <input className={inputCls} value={form.wifi_password ?? ''} onChange={e => setForm(f => ({ ...f, wifi_password: e.target.value }))} />
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">備註</p>
              <textarea rows={3} className={`${inputCls} resize-none`} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <p className="text-[11px] text-gray-400 mt-2">更多欄位（帳密、監視器、聯絡窗口等）請到「基本資料」頁編輯。</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="lp-btn-ghost flex-1 py-2.5 text-sm">取消</button>
              <button onClick={saveStore} disabled={saving || !form.name} className="lp-btn-primary flex-1 py-2.5 text-sm">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 照片放大檢視 ── */}
      {photoView !== null && photoFeed[photoView] && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={() => setPhotoView(null)}>
          <button onClick={() => setPhotoView(null)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors" aria-label="關閉">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          {photoView > 0 && (
            <button onClick={e => { e.stopPropagation(); setPhotoView(v => (v! - 1)) }} className="absolute left-3 sm:left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors" aria-label="上一張">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" /></svg>
            </button>
          )}
          {photoView < photoFeed.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setPhotoView(v => (v! + 1)) }} className="absolute right-3 sm:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors" aria-label="下一張">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <div onClick={e => e.stopPropagation()} className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoFeed[photoView].url} alt={photoFeed[photoView].task || '現場照片'} className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg" />
            <p className="text-white/80 text-sm mt-3">{photoFeed[photoView].date}{photoFeed[photoView].task ? ` · ${photoFeed[photoView].task}` : ''}</p>
          </div>
        </div>
      )}
    </>
  )
}
