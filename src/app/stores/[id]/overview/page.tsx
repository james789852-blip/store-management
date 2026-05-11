'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { differenceInDays, differenceInMonths } from 'date-fns'
import {
  STORE_STATUS_LABEL, SCHEDULE_STATUS_LABEL, LOG_STATUS_LABEL, TODO_PRIORITY_LABEL,
  type Store, type StoreStatus, type ScheduleStatus, type LogStatus, type TodoPriority,
} from '@/types'
import { STORE_STATUS_BADGE, SCHEDULE_BADGE, LOG_BADGE, TODO_PRIORITY_DOT, TODO_PRIORITY_BADGE } from '@/lib/colors'

// ── Local types ───────────────────────────────────────────────

interface OvSchedule {
  id: string
  task_name: string
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

function fmtMoney(n: number): string {
  return `NT$ ${n.toLocaleString()}`
}

function schedulePct(s: OvSchedule): number {
  if (s.status === 'done') return 100
  if (!s.start_date || !s.end_date || s.status === 'pending') return 0
  const today = parseLocal(todayStr())
  const start = parseLocal(s.start_date)
  const end = parseLocal(s.end_date)
  const total = end.getTime() - start.getTime()
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round(((today.getTime() - start.getTime()) / total) * 100)))
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function todoTimeLabel(dueDate: string | null, today: string): { text: string; cls: string } {
  if (!dueDate) return { text: '', cls: '' }
  const diff = differenceInDays(parseLocal(dueDate), parseLocal(today))
  if (diff < 0)  return { text: `已逾期 ${Math.abs(diff)} 天`, cls: 'text-red-500 font-semibold' }
  if (diff === 0) return { text: '今日截止', cls: 'text-orange-500 font-semibold' }
  if (diff === 1) return { text: '明日截止', cls: 'text-orange-400 font-medium' }
  if (diff <= 7)  return { text: `還有 ${diff} 天`, cls: 'text-amber-500 font-medium' }
  return { text: dueDate, cls: 'text-gray-400' }
}

function scheduleTimeLabel(s: OvSchedule, today: string): string {
  if (s.status === 'overdue' && s.end_date) {
    const d = differenceInDays(parseLocal(today), parseLocal(s.end_date))
    return `逾期 ${Math.max(0, d)} 天`
  }
  if (s.status === 'ongoing' && s.end_date) {
    const d = differenceInDays(parseLocal(s.end_date), parseLocal(today))
    return d >= 0 ? `${d} 天後完工` : `逾期 ${Math.abs(d)} 天`
  }
  if (s.status === 'pending' && s.start_date) {
    const d = differenceInDays(parseLocal(s.start_date), parseLocal(today))
    return d >= 0 ? `${d} 天後開始` : ''
  }
  return ''
}

// ── Skeleton ──────────────────────────────────────────────────

function Skel({ cls = '' }: { cls?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${cls}`} />
}

// ── Input helpers ─────────────────────────────────────────────

const inputCls = 'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-sm font-medium text-gray-700'

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
  const [progressExpanded, setProgressExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Store>>({})
  const [saving, setSaving] = useState(false)

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
        .select('id, task_name, start_date, end_date, status')
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
        .select('id, date, task_name, vendor, status, progress, issue')
        .eq('store_id', id)
        .order('date', { ascending: false })
        .limit(3),
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

  // ── Computed ──────────────────────────────────────────────────

  const overdueTodos = todos.filter(t => t.due_date && t.due_date < today)
  const todayTodos   = todos.filter(t => t.due_date === today)
  const overdueSchs  = schedules.filter(s => s.status === 'overdue')

  const schDone  = schedules.filter(s => s.status === 'done').length
  const schTotal = schedules.length
  const schPct   = schTotal > 0 ? Math.round((schDone / schTotal) * 100) : 0

  const daysToOpen = store?.open_date ? differenceInDays(parseLocal(store.open_date), parseLocal(today)) : null
  const monthsOpen = daysToOpen !== null && daysToOpen < 0 && store?.open_date
    ? differenceInMonths(parseLocal(today), parseLocal(store.open_date))
    : null

  const remainInvPct = Math.max(0, targetInvPct - totalInvPct)

  const sortedTodos = [...todos].sort((a, b) => {
    const rank = (t: OvTodo) => t.due_date && t.due_date < today ? 0 : t.due_date === today ? 1 : 2
    const dr = rank(a) - rank(b)
    if (dr !== 0) return dr
    return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
  })

  const recentSchedules = [...schedules]
    .filter(s => s.status !== 'done')
    .sort((a, b) => {
      const rank: Record<string, number> = { overdue: 0, ongoing: 1, pending: 2 }
      const dr = (rank[a.status] ?? 3) - (rank[b.status] ?? 3)
      if (dr !== 0) return dr
      return (a.start_date ?? '').localeCompare(b.start_date ?? '')
    })
    .slice(0, 6)

  const hasAlert = overdueTodos.length > 0 || overdueSchs.length > 0

  // ── Skeleton ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-[#F5F4F0] min-h-full p-5 sm:p-8 space-y-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2"><Skel cls="h-9 w-52" /><Skel cls="h-4 w-72" /></div>
          <Skel cls="h-9 w-28" />
        </div>
        <Skel cls="h-16 w-full rounded-xl" />
        <Skel cls="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skel key={i} cls="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skel cls="h-56 rounded-2xl" /><Skel cls="h-56 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skel cls="h-56 rounded-2xl" /><Skel cls="h-56 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!store) return <div className="flex items-center justify-center py-32 text-gray-400">找不到店面</div>

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-[#F5F4F0] min-h-full p-5 sm:p-8 space-y-5">

        {/* ── 1. Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{store.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STORE_STATUS_BADGE[store.status]}`}>
                {STORE_STATUS_LABEL[store.status]}
              </span>
            </div>
            {store.address && <p className="text-sm text-gray-400">📍 {store.address}</p>}
          </div>
          <button
            onClick={() => { setForm(store); setEditing(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            編輯店面
          </button>
        </div>

        {/* ── 2. Alert bar ── */}
        {hasAlert && (() => {
          const parts: string[] = []
          if (daysToOpen !== null && daysToOpen > 0) parts.push(`距開幕剩 ${daysToOpen} 天`)
          if (overdueTodos.length > 0 && overdueSchs.length > 0)
            parts.push(`有 ${overdueTodos.length} 項逾期待辦、${overdueSchs.length} 項逾期工程`)
          else if (overdueTodos.length > 0)
            parts.push(`有 ${overdueTodos.length} 項逾期待辦`)
          else
            parts.push(`有 ${overdueSchs.length} 項逾期工程`)

          const subItems = [
            ...overdueSchs.slice(0, 2).map(s => `${s.task_name}逾期`),
            ...overdueTodos.slice(0, 3).map(t => t.title),
          ].slice(0, 4)

          return (
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-[10px] border"
              style={{ background: '#FAEEDA', borderColor: '#FAC775' }}>
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold leading-none">!</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-orange-900">{parts.join('，')}</p>
                  {subItems.length > 0 && (
                    <p className="text-xs text-orange-700/80 mt-0.5 truncate">
                      {subItems.join('・')}
                    </p>
                  )}
                </div>
              </div>
              <Link href={`/stores/${id}/todos`}
                className="shrink-0 px-4 py-2 bg-white border border-orange-200 text-orange-800 text-sm font-semibold rounded-lg hover:bg-orange-50 transition-colors whitespace-nowrap shadow-sm">
                立即處理
              </Link>
            </div>
          )
        })()}

        {/* ── 3. 建置整體進度條 ── */}
        {schTotal > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <button
              className="w-full flex items-center justify-between mb-3 text-left"
              onClick={() => setProgressExpanded(e => !e)}
            >
              <span className="text-sm font-semibold text-gray-700">建置整體進度</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{schPct}% · {schDone}/{schTotal} 工項完成</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${progressExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-6">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${schPct}%`, background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 100%)' }} />
            </div>
            {/* Step dots — 近期工項（最後一個已完成 + 進行中/逾期 + 下一批待開始），最多 6 個 */}
            {(() => {
              const lastDone = schedules.filter(s => s.status === 'done').slice(-1)
              const nonDone  = schedules.filter(s => s.status !== 'done')
              const visible  = [...lastDone, ...nonDone].slice(0, 6)
              if (visible.length === 0) return null
              return (
                <div className="relative pt-0 pb-1">
                  <div className="absolute left-0 right-0 h-0.5 bg-gray-200" style={{ top: 14 }} />
                  <div className="flex justify-between relative">
                    {visible.map((s) => (
                      <div key={s.id} className="flex flex-col items-center flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold relative z-10 ring-2 ring-white
                          ${s.status === 'done'    ? 'bg-emerald-500 text-white' :
                            s.status === 'ongoing' ? 'bg-blue-600 text-white' :
                            s.status === 'overdue' ? 'bg-red-500 text-white' :
                                                      'bg-gray-200 text-gray-500'}`}>
                          {s.status === 'done' ? '✓' : s.status === 'ongoing' ? '↻' :
                           s.status === 'overdue' ? '!' : '○'}
                        </div>
                        <p className={`text-[11px] mt-2 text-center leading-tight
                          ${s.status === 'done'    ? 'text-emerald-600 font-medium' :
                            s.status === 'ongoing' ? 'text-blue-600 font-medium' :
                            s.status === 'overdue' ? 'text-red-500 font-medium' :
                                                      'text-gray-400'}`}
                          title={s.task_name}>
                          {trunc(s.task_name, 5)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
            {/* 展開：完整工項列表 */}
            {progressExpanded && (
              <div className="mt-5 border-t border-gray-100 pt-4 space-y-3">
                {schedules.map(s => {
                  const pct = schedulePct(s)
                  const barCls = s.status === 'done'    ? 'bg-emerald-400'
                               : s.status === 'ongoing' ? 'bg-blue-400'
                               : s.status === 'overdue' ? 'bg-red-400'
                               : 'bg-gray-200'
                  const timeHint = scheduleTimeLabel(s, today)
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="shrink-0" style={{ width: 88 }}>
                        <p className="text-xs text-gray-700 truncate font-medium" title={s.task_name}>{s.task_name}</p>
                        {timeHint && (
                          <p className={`text-[10px] mt-0.5 ${s.status === 'overdue' ? 'text-red-500' : s.status === 'ongoing' ? 'text-blue-500' : s.status === 'done' ? 'text-emerald-500' : 'text-gray-400'}`}>
                            {timeHint}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${SCHEDULE_BADGE[s.status]}`}>
                        {SCHEDULE_STATUS_LABEL[s.status]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 4. 四張摘要卡 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 距開幕 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 mb-2">距開幕</p>
            {daysToOpen !== null ? (
              <>
                <p className={`text-2xl font-bold tracking-tight leading-none ${daysToOpen > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                  {daysToOpen > 0
                    ? `${daysToOpen} 天`
                    : monthsOpen !== null && monthsOpen > 0
                    ? `已開幕 ${monthsOpen} 月`
                    : '今日開幕'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {daysToOpen > 0 ? `預計 ${store.open_date}` : `${store.open_date} 開幕`}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-200">未設定</p>
            )}
          </div>

          {/* 累計費用 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <p className="text-xs font-medium text-gray-400 mb-2">累計費用</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">{fmtMoney(totalExpenses)}</p>
            {store.total_budget != null && (
              <p className="text-xs text-gray-400 mt-1">預算 {fmtMoney(store.total_budget)}</p>
            )}
            <Link href={`/stores/${id}/expenses`} className="mt-auto pt-3 text-xs text-blue-500 hover:text-blue-600 font-medium">
              查看明細 →
            </Link>
          </div>

          {/* 逾期待辦 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <p className="text-xs font-medium text-gray-400 mb-2">逾期待辦</p>
            <p className={`text-2xl font-bold tracking-tight ${overdueTodos.length > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
              {overdueTodos.length}
            </p>
            <p className="text-xs text-gray-400 mt-1">今日到期 {todayTodos.length} 件</p>
            <Link href={`/stores/${id}/todos`} className="mt-auto pt-3 text-xs text-blue-500 hover:text-blue-600 font-medium">
              查看待辦 →
            </Link>
          </div>

          {/* 股東募資 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <p className="text-xs font-medium text-gray-400 mb-2">股東募資</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalInvPct.toFixed(2)}%</p>
            {totalInvAmount > 0 && (
              <p className="text-sm font-semibold text-gray-600 mt-0.5">{fmtMoney(totalInvAmount)}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">目標 {targetInvPct}% · 剩 {remainInvPct.toFixed(2)}%</p>
            <Link href={`/stores/${id}/investors`} className="mt-auto pt-3 text-xs text-blue-500 hover:text-blue-600 font-medium">
              查看股東 →
            </Link>
          </div>
        </div>

        {/* ── 5. Row 1: 基本資訊 + 待辦事項 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* 基本資訊 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">基本資訊</h2>
              <Link href={`/stores/${id}/basic`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">編輯 →</Link>
            </div>
            <dl className="divide-y divide-gray-50">
              {([
                { label: '電話',     value: store.phone },
                { label: '坪數',     value: store.sqft != null ? `${store.sqft} 坪` : null },
                { label: '座位數',   value: store.seats != null ? `${store.seats} 位` : null },
                { label: '月租金',   value: store.monthly_rent != null ? fmtMoney(store.monthly_rent) : null },
                { label: '押金',     value: store.deposit != null ? fmtMoney(store.deposit) : null },
                { label: '租約到期', value: store.lease_end_date },
                { label: '營業時間', value: store.business_hours },
                { label: '負責人',   value: store.owner_name
                    ? `${store.owner_name}${store.owner_phone ? `　${store.owner_phone}` : ''}` : null },
              ] as { label: string; value: string | null | undefined }[])
                .filter(f => f.value)
                .map(f => (
                  <div key={f.label} className="flex items-center justify-between py-2.5">
                    <dt className="text-xs text-gray-400 shrink-0 w-16">{f.label}</dt>
                    <dd className="text-sm font-medium text-gray-800 text-right">{f.value}</dd>
                  </div>
                ))
              }
            </dl>
          </div>

          {/* 待辦事項 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-700">待辦事項</h2>
                {overdueTodos.length > 0 && (
                  <span className="text-[11px] px-1.5 py-0.5 bg-red-100 text-red-600 font-bold rounded-md">
                    {overdueTodos.length} 逾期
                  </span>
                )}
              </div>
              <Link href={`/stores/${id}/todos`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">全部 →</Link>
            </div>
            {sortedTodos.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-10">所有待辦已完成 🎉</p>
            ) : (
              <div className="space-y-2.5">
                {sortedTodos.slice(0, 5).map(todo => {
                  const priority = (todo.priority as TodoPriority) || 'low'
                  const timeLabel = todoTimeLabel(todo.due_date, today)
                  return (
                    <div key={todo.id} className="flex items-start gap-2.5">
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${TODO_PRIORITY_DOT[priority]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm text-gray-800 truncate leading-snug flex-1">{todo.title}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${TODO_PRIORITY_BADGE[priority]}`}>
                            {TODO_PRIORITY_LABEL[priority]}
                          </span>
                        </div>
                        {timeLabel.text && (
                          <p className={`text-xs mt-0.5 ${timeLabel.cls}`}>{timeLabel.text}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
                {todos.length > 5 && (
                  <p className="text-xs text-gray-400 pt-1">還有 {todos.length - 5} 項未顯示...</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 6. Row 2: 建置排程 + 施工日誌 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* 建置排程 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">建置排程</h2>
              <Link href={`/stores/${id}/schedule`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">查看排程 →</Link>
            </div>
            {recentSchedules.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-10">近期無待處理工項</p>
            ) : (
              <div className="space-y-3">
                {recentSchedules.map(s => {
                  const pct = schedulePct(s)
                  const barCls = s.status === 'ongoing' ? 'bg-blue-400'
                               : s.status === 'overdue' ? 'bg-red-400'
                               : 'bg-gray-200'
                  const timeHint = scheduleTimeLabel(s, today)
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="shrink-0" style={{ width: 80 }}>
                        <p className="text-xs text-gray-700 truncate font-medium" title={s.task_name}>{s.task_name}</p>
                        {timeHint && (
                          <p className={`text-[10px] mt-0.5 ${s.status === 'overdue' ? 'text-red-500' : s.status === 'ongoing' ? 'text-blue-500' : 'text-gray-400'}`}>
                            {timeHint}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${SCHEDULE_BADGE[s.status]}`}>
                        {SCHEDULE_STATUS_LABEL[s.status]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 施工日誌 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">最近施工日誌</h2>
              <Link href={`/stores/${id}/log`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">全部 →</Link>
            </div>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-10">尚無日誌記錄</p>
            ) : (
              <div className="space-y-2">
                {logs.map(log => {
                  const d = parseLocal(log.date)
                  const weekday = ['日','一','二','三','四','五','六'][d.getDay()]
                  const content = log.progress || log.issue || ''
                  return (
                    <Link key={log.id} href={`/stores/${id}/log`}
                      className="flex items-start gap-3 p-3 rounded-[7px] transition-colors hover:brightness-95 cursor-pointer"
                      style={{ background: '#F8F7F4' }}>
                      <div className="shrink-0 text-center" style={{ minWidth: 32 }}>
                        <p className="text-lg font-bold text-gray-800 leading-none">{log.date.slice(8)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">週{weekday}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {log.task_name || '施工日誌'}{log.vendor ? ` · ${log.vendor}` : ''}
                        </p>
                        {content && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{trunc(content, 40)}</p>
                        )}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${LOG_BADGE[log.status]}`}>
                        {LOG_STATUS_LABEL[log.status]}{log.status === 'issue' ? ' ⚠' : ''}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>店名 *</label>
                  <input className={inputCls} value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>狀態</label>
                  <select className={inputCls} value={form.status ?? 'building'}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as StoreStatus }))}>
                    {(Object.entries(STORE_STATUS_LABEL) as [StoreStatus, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>地址</label>
                <input className={inputCls} value={form.address ?? ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>電話</label>
                  <input className={inputCls} value={form.phone ?? ''}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>座位數</label>
                  <input type="number" className={inputCls} value={form.seats ?? ''}
                    onChange={e => setForm(f => ({ ...f, seats: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>坪數</label>
                  <input type="number" className={inputCls} value={form.sqft ?? ''}
                    onChange={e => setForm(f => ({ ...f, sqft: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className={labelCls}>月租金</label>
                  <input type="number" className={inputCls} value={form.monthly_rent ?? ''}
                    onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className={labelCls}>押金</label>
                  <input type="number" className={inputCls} value={form.deposit ?? ''}
                    onChange={e => setForm(f => ({ ...f, deposit: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>開幕日</label>
                  <input type="date" className={inputCls} value={form.open_date ?? ''}
                    onChange={e => setForm(f => ({ ...f, open_date: e.target.value || null }))} />
                </div>
                <div>
                  <label className={labelCls}>租約到期日</label>
                  <input type="date" className={inputCls} value={form.lease_end_date ?? ''}
                    onChange={e => setForm(f => ({ ...f, lease_end_date: e.target.value || null }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>營業時間</label>
                <input className={inputCls} placeholder="例：11:00–21:00" value={form.business_hours ?? ''}
                  onChange={e => setForm(f => ({ ...f, business_hours: e.target.value }))} />
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Wi-Fi</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label className={labelCls}>SSID</label>
                <input className={inputCls} value={form.wifi_ssid ?? ''}
                  onChange={e => setForm(f => ({ ...f, wifi_ssid: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>密碼</label>
                <input className={inputCls} value={form.wifi_password ?? ''}
                  onChange={e => setForm(f => ({ ...f, wifi_password: e.target.value }))} />
              </div>
            </div>

            <div className="mb-6">
              <label className={labelCls}>備註</label>
              <textarea rows={3} className={`${inputCls} resize-none`} value={form.notes ?? ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={saveStore} disabled={saving || !form.name}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
