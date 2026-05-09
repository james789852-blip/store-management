'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { STORE_STATUS_LABEL, type Store, type StoreStatus, type ScheduleStatus } from '@/types'
import { STORE_STATUS_BADGE, SCHEDULE_BADGE } from '@/lib/colors'
import Link from 'next/link'

const SCHEDULE_STATUS_LABEL: Record<string, string> = {
  pending: '待開始',
  ongoing: '進行中',
  done: '完成',
  overdue: '已逾期',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface StoreStaff {
  id: string
  role: string
  name: string
  phone: string | null
  sort_order: number
}

interface TodayTask {
  id: string
  task_name: string
  vendor: string | null
  start_date: string | null
  end_date: string | null
  status: ScheduleStatus
}

interface RecentLog {
  date: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function localMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function todayMidnight(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function daysFromToday(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.round((localMidnight(dateStr).getTime() - todayMidnight().getTime()) / 86_400_000)
}

function fmtMoney(n: number | null) {
  return n != null ? `NT$ ${n.toLocaleString()}` : null
}

// ── Input helpers ────────────────────────────────────────────────────────────

const inputCls =
  'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

const labelCls = 'block text-sm font-medium text-gray-700 mb-0'

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <dt className="text-sm text-gray-400 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 text-right ml-4">
        {value != null && value !== '' ? String(value) : <span className="text-gray-300">—</span>}
      </dd>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>()

  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Store>>({})
  const [saving, setSaving] = useState(false)

  const [totalExpenses, setTotalExpenses] = useState(0)
  const [todoTotal, setTodoTotal] = useState(0)
  const [todoDone, setTodoDone] = useState(0)
  const [pendingTodos, setPendingTodos] = useState<{ id: string; title: string; due_date: string | null; priority: string }[]>([])
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([])
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [staff, setStaff] = useState<StoreStaff[]>([])

  useEffect(() => { loadAll() }, [id])  // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)

    const [
      { data: storeData },
      { data: expenses },
      { data: todos },
      { data: logs },
      { data: schedules },
      { data: staffData },
    ] = await Promise.all([
      supabase.from('stores').select('*').eq('id', id).single(),
      supabase.from('expenses').select('total').eq('store_id', id),
      supabase.from('todos').select('id, title, done, due_date, priority').eq('store_id', id).order('created_at', { ascending: true }),
      supabase.from('construction_logs').select('date').eq('store_id', id).order('date', { ascending: false }).limit(3),
      supabase.from('build_schedules')
        .select('id, task_name, vendor, start_date, end_date, status')
        .eq('store_id', id)
        .neq('status', 'done')
        .lte('start_date', today)
        .gte('end_date', today),
      supabase.from('store_staff').select('id, role, name, phone, sort_order').eq('store_id', id).order('sort_order'),
    ])

    if (storeData) {
      setStore(storeData as Store)
      setForm(storeData as Store)
    }

    setTotalExpenses((expenses || []).reduce((sum, e) => sum + (e.total ?? 0), 0))

    const allTodos = todos || []
    setTodoTotal(allTodos.length)
    setTodoDone(allTodos.filter(t => t.done).length)
    setPendingTodos(
      allTodos
        .filter(t => !t.done)
        .slice(0, 5)
        .map(t => ({ id: t.id, title: t.title, due_date: t.due_date ?? null, priority: t.priority ?? 'mid' }))
    )

    setRecentLogs(logs || [])
    setTodayTasks((schedules || []) as TodayTask[])
    setStaff((staffData || []) as StoreStaff[])

    setLoading(false)
  }

  async function saveStore() {
    if (!form.name) return
    setSaving(true)

    const payload: Partial<Store> = {
      name: form.name,
      status: form.status,
      address: form.address || null,
      phone: form.phone || null,
      tax_id: form.tax_id || null,
      sqft: form.sqft ?? null,
      monthly_rent: form.monthly_rent ?? null,
      deposit: form.deposit ?? null,
      open_date: form.open_date || null,
      business_hours: form.business_hours || null,
      seats: form.seats ?? null,
      wifi_ssid: form.wifi_ssid || null,
      wifi_password: form.wifi_password || null,
      cctv_account: form.cctv_account || null,
      cctv_password: form.cctv_password || null,
      pos_account: form.pos_account || null,
      pos_password: form.pos_password || null,
      owner_name: form.owner_name || null,
      owner_phone: form.owner_phone || null,
      landlord_name: form.landlord_name || null,
      landlord_phone: form.landlord_phone || null,
      electric_vendor: form.electric_vendor || null,
      gas_vendor: form.gas_vendor || null,
      notes: form.notes || null,
    }

    await supabase.from('stores').update(payload).eq('id', id)
    setSaving(false)
    setEditing(false)
    loadAll()
  }

  // ── Computed values ────────────────────────────────────────────────────────

  const daysToOpen = daysFromToday(store?.open_date ?? null)

  // ── Loading / not found ────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>
  }
  if (!store) {
    return <div className="flex items-center justify-center py-32 text-gray-400">找不到店面</div>
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STORE_STATUS_BADGE[store.status]}`}>
                {STORE_STATUS_LABEL[store.status]}
              </span>
            </div>
            {store.address && (
              <p className="text-sm text-gray-400">📍 {store.address}</p>
            )}
          </div>
          <button
            onClick={() => { setForm(store); setEditing(true) }}
            className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            編輯
          </button>
        </div>

        {/* ── 統計卡 ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 mb-3">累計費用</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">NT$ {totalExpenses.toLocaleString()}</p>
            <Link href={`/stores/${id}/expenses`} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-3 font-medium">查看明細 →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 mb-3">{daysToOpen !== null && daysToOpen >= 0 ? '距開幕' : '已開幕'}</p>
            <p className={`text-2xl font-bold tracking-tight ${daysToOpen !== null && daysToOpen <= 30 && daysToOpen >= 0 ? 'text-orange-500' : 'text-gray-900'}`}>
              {daysToOpen !== null ? `${Math.abs(daysToOpen)} 天` : '—'}
            </p>
            {store.open_date && <p className="text-xs text-gray-400 mt-3">{store.open_date}</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-400">待辦事項</p>
              <div className="flex items-center gap-2">
                {todoTotal > 0 && (
                  <span className="text-xs text-gray-400">{todoDone}/{todoTotal}</span>
                )}
                <Link href={`/stores/${id}/todos`} className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">全部 →</Link>
              </div>
            </div>
            {todoTotal > 0 && (
              <div className="mb-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full transition-all" style={{ width: `${Math.round((todoDone / todoTotal) * 100)}%` }} />
              </div>
            )}
            {pendingTodos.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-3">所有待辦已完成 🎉</p>
            ) : (
              <div className="space-y-2">
                {pendingTodos.map(todo => (
                  <div key={todo.id} className="flex items-start gap-2">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      todo.priority === 'high' ? 'bg-red-400' :
                      todo.priority === 'mid'  ? 'bg-amber-400' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate leading-snug">{todo.title}</p>
                      {todo.due_date && (
                        <p className={`text-xs mt-0.5 ${todo.due_date < new Date().toISOString().slice(0,10) ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                          {todo.due_date}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {todoTotal - todoDone > 5 && (
                  <p className="text-xs text-gray-400 pt-1">還有 {todoTotal - todoDone - 5} 項未顯示...</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 主內容：左主欄 2/3 ＋ 右側欄 1/3 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── 左主欄 ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* 基本資訊 */}
            {(() => {
              const fields = ([
                { label: '電話', value: store.phone },
                { label: '統一編號', value: store.tax_id },
                { label: '坪數', value: store.sqft != null ? `${store.sqft} 坪` : null },
                { label: '座位數', value: store.seats != null ? `${store.seats} 位` : null },
                { label: '月租金', value: fmtMoney(store.monthly_rent) },
                { label: '押金', value: fmtMoney(store.deposit) },
                { label: '開幕日', value: store.open_date },
                { label: '營業時間', value: store.business_hours },
              ] as { label: string; value: string | null | undefined }[]).filter(f => f.value)
              return fields.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">基本資訊</h2>
                  <dl className="grid grid-cols-2 gap-x-8">
                    {fields.map(f => (
                      <div key={f.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <dt className="text-sm text-gray-400">{f.label}</dt>
                        <dd className="text-sm font-semibold text-gray-800">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null
            })()}

            {/* 今日工程 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">今日工程</h2>
                <Link href={`/stores/${id}/schedule`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">排程 →</Link>
              </div>
              {todayTasks.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-6">今日無進行中工程</p>
              ) : (
                <div className="space-y-2">
                  {todayTasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{task.task_name}</p>
                        {task.vendor && <p className="text-xs text-gray-400 mt-0.5">{task.vendor}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCHEDULE_BADGE[task.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {SCHEDULE_STATUS_LABEL[task.status] ?? task.status}
                        </span>
                        {task.end_date && <span className="text-xs text-gray-400">到 {task.end_date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 備註 */}
            {store.notes && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">備註</h2>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{store.notes}</p>
              </div>
            )}
          </div>

          {/* ── 右側欄 ── */}
          <div className="space-y-6">

            {/* 人員聯絡 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">人員聯絡</h2>
              <div className="space-y-4">
                {store.owner_name && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                      {store.owner_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{store.owner_name}</p>
                      {store.owner_phone && <p className="text-xs text-gray-400 mt-0.5">{store.owner_phone}</p>}
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-semibold shrink-0">負責人</span>
                  </div>
                )}
                {staff.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                      {s.phone && <p className="text-xs text-gray-400 mt-0.5">{s.phone}</p>}
                    </div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-semibold shrink-0">{s.role}</span>
                  </div>
                ))}
                {store.landlord_name && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-600 shrink-0">
                      {store.landlord_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{store.landlord_name}</p>
                      {store.landlord_phone && <p className="text-xs text-gray-400 mt-0.5">{store.landlord_phone}</p>}
                    </div>
                    <span className="text-[10px] bg-amber-50 text-amber-500 px-2 py-0.5 rounded-full font-semibold shrink-0">房東</span>
                  </div>
                )}
                {!store.owner_name && staff.length === 0 && !store.landlord_name && (
                  <p className="text-sm text-gray-300 text-center py-4">尚無人員資料</p>
                )}
              </div>
            </div>

            {/* 最近日誌 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">最近日誌</h2>
                <Link href={`/stores/${id}/log`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">全部 →</Link>
              </div>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-4">尚無日誌記錄</p>
              ) : (
                <div>
                  {recentLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                      <span className="text-sm text-gray-600">{log.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 設備 & 帳號 */}
            {(store.wifi_ssid || store.cctv_account || store.pos_account) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">設備 & 帳號</h2>
                <div className="space-y-3">
                  {store.wifi_ssid && (
                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Wi-Fi</p>
                      <p className="text-sm font-semibold text-gray-800">{store.wifi_ssid}</p>
                      {store.wifi_password && <p className="text-xs text-gray-400 mt-1">密碼：{store.wifi_password}</p>}
                    </div>
                  )}
                  {store.cctv_account && (
                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">監控</p>
                      <p className="text-sm font-semibold text-gray-800">{store.cctv_account}</p>
                      {store.cctv_password && <p className="text-xs text-gray-400 mt-1">密碼：{store.cctv_password}</p>}
                    </div>
                  )}
                  {store.pos_account && (
                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">POS</p>
                      <p className="text-sm font-semibold text-gray-800">{store.pos_account}</p>
                      {store.pos_password && <p className="text-xs text-gray-400 mt-1">密碼：{store.pos_password}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>{/* /max-w-5xl */}

      {/* ── Edit modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900 text-lg">編輯店面資料</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {/* 基本資訊 section */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">基本資訊</p>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>店名 *</label>
                  <input className={inputCls} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>狀態</label>
                  <select className={inputCls} value={form.status ?? 'building'} onChange={e => setForm(f => ({ ...f, status: e.target.value as StoreStatus }))}>
                    {(Object.entries(STORE_STATUS_LABEL) as [StoreStatus, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>地址</label>
                <input className={inputCls} value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>電話</label>
                  <input className={inputCls} value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>統一編號</label>
                  <input className={inputCls} value={form.tax_id ?? ''} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>開幕日</label>
                  <input type="date" className={inputCls} value={form.open_date ?? ''} onChange={e => setForm(f => ({ ...f, open_date: e.target.value || null }))} />
                </div>
                <div>
                  <label className={labelCls}>座位數</label>
                  <input type="number" className={inputCls} value={form.seats ?? ''} onChange={e => setForm(f => ({ ...f, seats: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>營業時間</label>
                <input className={inputCls} placeholder="例：11:00–21:00" value={form.business_hours ?? ''} onChange={e => setForm(f => ({ ...f, business_hours: e.target.value }))} />
              </div>
            </div>

            {/* 人員 section */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">人員</p>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>負責人姓名</label>
                  <input className={inputCls} value={form.owner_name ?? ''} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>負責人電話</label>
                  <input className={inputCls} value={form.owner_phone ?? ''} onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>房東姓名</label>
                  <input className={inputCls} value={form.landlord_name ?? ''} onChange={e => setForm(f => ({ ...f, landlord_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>房東電話</label>
                  <input className={inputCls} value={form.landlord_phone ?? ''} onChange={e => setForm(f => ({ ...f, landlord_phone: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* 設備帳號 section */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">設備帳號</p>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Wi-Fi SSID</label>
                  <input className={inputCls} value={form.wifi_ssid ?? ''} onChange={e => setForm(f => ({ ...f, wifi_ssid: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Wi-Fi 密碼</label>
                  <input className={inputCls} value={form.wifi_password ?? ''} onChange={e => setForm(f => ({ ...f, wifi_password: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>監控帳號</label>
                  <input className={inputCls} value={form.cctv_account ?? ''} onChange={e => setForm(f => ({ ...f, cctv_account: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>監控密碼</label>
                  <input className={inputCls} value={form.cctv_password ?? ''} onChange={e => setForm(f => ({ ...f, cctv_password: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>POS 帳號</label>
                  <input className={inputCls} value={form.pos_account ?? ''} onChange={e => setForm(f => ({ ...f, pos_account: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>POS 密碼</label>
                  <input className={inputCls} value={form.pos_password ?? ''} onChange={e => setForm(f => ({ ...f, pos_password: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* 備註 */}
            <div className="mb-6">
              <label className={labelCls}>備註</label>
              <textarea rows={3} className={`${inputCls} resize-none`} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
    </div>
  )
}
