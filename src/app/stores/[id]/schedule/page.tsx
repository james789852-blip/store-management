'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { BuildSchedule, ScheduleStatus } from '@/types'
import { SCHEDULE_STATUS_LABEL } from '@/types'
import { SCHEDULE_BADGE } from '@/lib/colors'

const TODAY = new Date().toISOString().slice(0, 10)

const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: '全部', label: '全部' },
  { key: 'pending', label: '待開始' },
  { key: 'ongoing', label: '進行中' },
  { key: 'done', label: '完成' },
  { key: 'overdue', label: '已逾期' },
]

const CAL_STATUS_STYLE: Record<ScheduleStatus, string> = {
  done:    'bg-green-100 text-green-800',
  ongoing: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700',
}

const CAL_DOT: Record<ScheduleStatus, string> = {
  done: 'bg-green-400',
  ongoing: 'bg-blue-500',
  pending: 'bg-gray-400',
  overdue: 'bg-red-400',
}

function isOverdue(item: BuildSchedule): boolean {
  return (item.status === 'pending' || item.status === 'ongoing') &&
    !!item.end_date && item.end_date < TODAY
}

function displayStatus(item: BuildSchedule): ScheduleStatus {
  return isOverdue(item) ? 'overdue' : item.status
}

type ScheduleForm = {
  task_name: string
  vendor: string
  start_date: string
  end_date: string
  status: ScheduleStatus
  depends_on: string
  note: string
}

function emptyForm(): ScheduleForm {
  return {
    task_name: '',
    vendor: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    depends_on: '',
    note: '',
  }
}

// ── Month Calendar View ────────────────────────────────────────────────────
function MonthCalendarView({ items }: { items: BuildSchedule[] }) {
  const now = new Date(TODAY)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon=0

  type CalCell = { dateStr: string; dayNum: number; inMonth: boolean; isToday: boolean; isWeekend: boolean }
  const cells: CalCell[] = []

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({ dateStr: d.toISOString().slice(0, 10), dayNum: d.getDate(), inMonth: false, isToday: false, isWeekend: d.getDay() === 0 || d.getDay() === 6 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ dateStr, dayNum: d, inMonth: true, isToday: dateStr === TODAY, isWeekend: date.getDay() === 0 || date.getDay() === 6 })
  }
  const remainder = cells.length % 7
  if (remainder > 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      const date = new Date(year, month + 1, d)
      cells.push({ dateStr: date.toISOString().slice(0, 10), dayNum: d, inMonth: false, isToday: false, isWeekend: date.getDay() === 0 || date.getDay() === 6 })
    }
  }

  function getDayTasks(dateStr: string): BuildSchedule[] {
    return items.filter(item => {
      if (!item.start_date && !item.end_date) return false
      const s = item.start_date || item.end_date!
      const e = item.end_date || item.start_date!
      return s <= dateStr && e >= dateStr
    })
  }

  const weeks: CalCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const selectedTasks = selectedDay ? getDayTasks(selectedDay) : []
  const undatedItems = items.filter(i => !i.start_date && !i.end_date)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <button onClick={prevMonth}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          ← 上個月
        </button>
        <div className="flex items-center gap-3">
          <p className="text-base font-bold text-gray-800">{year}年{month + 1}月</p>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            className="text-xs text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-50 font-medium border border-indigo-200 transition-colors">
            本月
          </button>
        </div>
        <button onClick={nextMonth}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          下個月 →
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-semibold ${i >= 5 ? 'text-rose-400' : 'text-gray-400'}`}>
            週{d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0" style={{ minHeight: 100 }}>
            {week.map(cell => {
              const tasks = cell.inMonth ? getDayTasks(cell.dateStr) : []
              const isSelected = selectedDay === cell.dateStr
              return (
                <div
                  key={cell.dateStr}
                  onClick={() => { if (!cell.inMonth) return; setSelectedDay(d => d === cell.dateStr ? null : cell.dateStr) }}
                  className={`border-r border-gray-100 last:border-r-0 p-2 transition-colors ${
                    !cell.inMonth ? 'bg-gray-50/50' :
                    isSelected ? 'bg-indigo-50 cursor-pointer' :
                    cell.isWeekend ? 'bg-rose-50/20 hover:bg-rose-50/50 cursor-pointer' :
                    'hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      cell.isToday ? 'bg-indigo-600 text-white' :
                      !cell.inMonth ? 'text-gray-300' :
                      cell.isWeekend ? 'text-rose-400' :
                      'text-gray-600'
                    }`}>
                      {cell.dayNum}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {tasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${CAL_STATUS_STYLE[displayStatus(task)]}`}
                        title={`${task.task_name}${task.vendor ? ` ／ ${task.vendor}` : ''} | ${task.start_date} → ${task.end_date}`}
                      >
                        {task.start_date === cell.dateStr && '▶ '}{task.task_name}
                      </div>
                    ))}
                    {tasks.length > 3 && (
                      <div className="text-[10px] text-gray-400 pl-1">+{tasks.length - 3} 更多</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="border-t border-indigo-100 bg-indigo-50/80 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-indigo-700">📅 {selectedDay} 工項</p>
            <button onClick={() => setSelectedDay(null)}
              className="text-xs text-indigo-400 hover:text-indigo-700 px-2 py-0.5 rounded-lg hover:bg-indigo-100">✕ 關閉</button>
          </div>
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-indigo-400">當日無進行中的工項</p>
          ) : (
            <ul className="space-y-2">
              {selectedTasks.map(item => {
                const ds = displayStatus(item)
                return (
                  <li key={item.id} className="flex items-center gap-3 text-sm bg-white/70 rounded-xl px-3 py-2">
                    <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${CAL_DOT[ds]}`} />
                    <span className="font-semibold text-gray-800">{item.task_name}</span>
                    {item.vendor && <span className="text-gray-400 text-xs">{item.vendor}</span>}
                    <span className="text-xs text-gray-300 ml-1">{item.start_date} → {item.end_date}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${SCHEDULE_BADGE[ds]}`}>
                      {SCHEDULE_STATUS_LABEL[ds]}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Undated items */}
      {undatedItems.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 mb-2">未設定日期</p>
          <div className="flex flex-wrap gap-1.5">
            {undatedItems.map(item => (
              <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCHEDULE_BADGE[displayStatus(item)]}`}>
                {item.task_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-100 bg-gray-50 flex-wrap">
        {(['done', 'ongoing', 'pending', 'overdue'] as ScheduleStatus[]).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${CAL_STATUS_STYLE[s]}`} />
            <span className="text-xs text-gray-500">{SCHEDULE_STATUS_LABEL[s]}</span>
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-auto">點選日期查看工項詳情</span>
      </div>
    </div>
  )
}

// ── Week View ──────────────────────────────────────────────────────────────
const WEEK_CELL_COLORS: Record<ScheduleStatus, string> = {
  done:    'bg-green-100 text-green-800 border-green-200',
  ongoing: 'bg-blue-100 text-blue-800 border-blue-200',
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().slice(0, 10)
}

function WeekView({ items }: { items: BuildSchedule[] }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(TODAY))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    return {
      dateStr,
      weekLabel: ['一', '二', '三', '四', '五', '六', '日'][i],
      dayNum: d.getDate(),
      month: d.getMonth() + 1,
      isToday: dateStr === TODAY,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      tasks: items.filter(item => {
        if (!item.start_date && !item.end_date) return false
        const s = item.start_date || item.end_date!
        const e = item.end_date || item.start_date!
        return s <= dateStr && e >= dateStr
      }),
    }
  })

  function shiftWeek(n: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + n * 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }

  const monthLabel = (() => {
    const months = [...new Set(days.map(d => d.month))]
    return months.map(m => `${m}月`).join(' / ')
  })()

  const maxTasks = Math.max(...days.map(d => d.tasks.length), 3)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <button
          onClick={() => shiftWeek(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ← 上週
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800">{monthLabel}</p>
          <p className="text-xs text-gray-400">{days[0].dateStr} ～ {days[6].dateStr}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setWeekStart(getMonday(TODAY))}
            className="text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
          >
            本週
          </button>
          <button
            onClick={() => shiftWeek(1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            下週 →
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7">
        {/* Day headers */}
        {days.map(day => (
          <div
            key={day.dateStr}
            className={`px-2 py-3 text-center border-r border-gray-100 last:border-r-0 ${
              day.isWeekend ? 'bg-gray-50' : ''
            } ${day.isToday ? 'bg-indigo-50' : ''}`}
          >
            <p className={`text-xs font-medium mb-0.5 ${day.isWeekend ? 'text-rose-400' : 'text-gray-400'}`}>
              週{day.weekLabel}
            </p>
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              day.isToday
                ? 'bg-indigo-600 text-white'
                : day.isWeekend
                ? 'text-rose-500'
                : 'text-gray-700'
            }`}>
              {day.dayNum}
            </div>
            {day.tasks.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">{day.tasks.length} 項</p>
            )}
          </div>
        ))}
      </div>

      {/* Task cells */}
      <div className="grid grid-cols-7 border-t border-gray-100" style={{ minHeight: maxTasks * 40 + 16 }}>
        {days.map(day => (
          <div
            key={day.dateStr}
            className={`border-r border-gray-100 last:border-r-0 p-2 ${
              day.isWeekend ? 'bg-gray-50/60' : ''
            } ${day.isToday ? 'bg-indigo-50/40' : ''}`}
          >
            {day.tasks.length === 0 ? (
              <div className="h-full flex items-start justify-center pt-4">
                <span className="text-gray-200 text-xs select-none">—</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {day.tasks.map(task => {
                  const ds = displayStatus(task)
                  return (
                    <div
                      key={task.id}
                      className={`text-xs px-2 py-1.5 rounded-lg border font-medium truncate leading-tight ${WEEK_CELL_COLORS[ds]}`}
                      title={`${task.task_name}${task.vendor ? ` ／ ${task.vendor}` : ''}\n${task.start_date} → ${task.end_date}`}
                    >
                      <div className="truncate">{task.task_name}</div>
                      {task.vendor && (
                        <div className="truncate opacity-60 text-[10px]">{task.vendor}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Daily schedule list */}
      <div className="border-t border-gray-200">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">每日工項清單</p>
        </div>
        {days.map(day => {
          const hasTasks = day.tasks.length > 0
          return (
            <div key={day.dateStr} className={`border-b border-gray-100 last:border-b-0 ${day.isToday ? 'bg-indigo-50/40' : ''}`}>
              <div className={`flex items-center gap-2.5 px-4 py-2 ${hasTasks ? 'bg-gray-50/60' : 'bg-transparent'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  day.isToday ? 'bg-indigo-600 text-white' : day.isWeekend ? 'text-rose-500' : 'text-gray-500'
                }`}>
                  {day.dayNum}
                </div>
                <span className={`text-xs font-semibold ${day.isWeekend ? 'text-rose-400' : 'text-gray-500'}`}>
                  週{day.weekLabel}
                </span>
                {day.isToday && <span className="text-[10px] text-indigo-500 font-medium bg-indigo-100 px-1.5 py-0.5 rounded-full">今天</span>}
                {hasTasks && (
                  <span className="ml-auto text-[10px] text-gray-400">{day.tasks.length} 項工項</span>
                )}
              </div>
              {hasTasks ? (
                <div className="px-4 pb-3 pt-1 space-y-1.5">
                  {day.tasks.map(task => {
                    const ds = displayStatus(task)
                    return (
                      <div key={task.id} className="flex items-center gap-2.5 py-1.5 px-3 rounded-xl bg-white border border-gray-100">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${CAL_DOT[ds]}`} />
                        <span className="text-sm font-medium text-gray-800 flex-1 min-w-0 truncate">{task.task_name}</span>
                        {task.vendor && <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{task.vendor}</span>}
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${SCHEDULE_BADGE[ds]}`}>
                          {SCHEDULE_STATUS_LABEL[ds]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-4 py-2 text-xs text-gray-300">無工項</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-100 bg-gray-50 flex-wrap">
        {(['ongoing', 'pending', 'done', 'overdue'] as ScheduleStatus[]).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${WEEK_CELL_COLORS[s]}`} />
            <span className="text-xs text-gray-500">{SCHEDULE_STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<BuildSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'week' | 'month'>('week')
  const [filter, setFilter] = useState('全部')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ScheduleForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    const { data } = await supabase
      .from('build_schedules')
      .select('*')
      .eq('store_id', id)
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('created_at')
    setItems(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.task_name) return
    setSaving(true)
    const payload = {
      store_id: id,
      task_name: form.task_name,
      vendor: form.vendor || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      depends_on: form.depends_on || null,
      note: form.note || null,
    }
    if (editId) {
      await supabase.from('build_schedules').update(payload).eq('id', editId)
    } else {
      await supabase.from('build_schedules').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm())
    load()
  }

  async function deleteItem(itemId: string) {
    await supabase.from('build_schedules').delete().eq('id', itemId)
    if (expandedId === itemId) setExpandedId(null)
    load()
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = items.map(i => ({
      工項名稱: i.task_name,
      廠商: i.vendor || '',
      開始日期: i.start_date || '',
      結束日期: i.end_date || '',
      狀態: SCHEDULE_STATUS_LABEL[displayStatus(i)],
      備註: i.note || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '建置排程')
    XLSX.writeFile(wb, `建置排程_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function openAdd() {
    setForm(emptyForm())
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(item: BuildSchedule) {
    setForm({
      task_name: item.task_name,
      vendor: item.vendor || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      status: item.status,
      depends_on: item.depends_on || '',
      note: item.note || '',
    })
    setEditId(item.id)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditId(null)
  }

  function toggleExpand(itemId: string) {
    setExpandedId(prev => (prev === itemId ? null : itemId))
  }

  const taskMap = Object.fromEntries(items.map(i => [i.id, i.task_name]))

  const filtered = filter === '全部'
    ? items
    : items.filter(item => displayStatus(item) === filter)

  const totalCount = items.length
  const doneCount = items.filter(i => i.status === 'done').length
  const ongoingCount = items.filter(i => i.status === 'ongoing' && !isOverdue(i)).length
  const overdueCount = items.filter(i => isOverdue(i)).length

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>
  }

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">建置排程</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-400">
              <span>共 {totalCount} 項工項</span>
              <span className="text-green-600 font-medium">完成 {doneCount}</span>
              <span className="text-blue-600 font-medium">進行中 {ongoingCount}</span>
              {overdueCount > 0 && (
                <span className="text-red-500 font-medium">已逾期 {overdueCount}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <button
                onClick={exportExcel}
                className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                匯出 Excel
              </button>
            )}
            <button
              onClick={openAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + 新增工項
            </button>
          </div>
        </div>

        {/* View toggle + Filter tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* View toggle */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {([
              { key: 'week',  label: '週視圖' },
              { key: 'month', label: '月曆' },
              { key: 'list',  label: '列表' },
            ] as const).map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === v.key
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                style={view === v.key ? { boxShadow: '0 2px 8px rgba(99,102,241,0.3)' } : {}}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Filter tabs (list mode only) */}
          {view === 'list' && (
            <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === tab.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium text-gray-600 mb-1">尚無工項資料</p>
            <p className="text-sm mb-6">新增工項，追蹤建置進度</p>
            <button
              onClick={openAdd}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              新增第一個工項
            </button>
          </div>
        ) : view === 'week' ? (
          <div className="overflow-x-auto rounded-2xl">
            <div className="min-w-[560px]"><WeekView items={items} /></div>
          </div>
        ) : view === 'month' ? (
          <div className="overflow-x-auto rounded-2xl">
            <div className="min-w-[560px]"><MonthCalendarView items={items} /></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-sm">沒有符合的工項</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['工項名稱', '廠商', '開始日期', '結束日期', '狀態', '操作'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(item => {
                    const ds = displayStatus(item)
                    const overdue = isOverdue(item)
                    const expanded = expandedId === item.id
                    const dependsOnName = item.depends_on ? taskMap[item.depends_on] : null

                    return (
                      <>
                        <tr
                          key={item.id}
                          onClick={() => toggleExpand(item.id)}
                          className={`group cursor-pointer transition-colors ${expanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">
                            <div className="flex items-center gap-2">
                              <span className={`text-gray-400 text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
                              <span className={overdue ? 'text-red-600' : ''}>{item.task_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{item.vendor || '-'}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.start_date || '-'}</td>
                          <td className={`px-4 py-3 whitespace-nowrap ${overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {item.end_date || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SCHEDULE_BADGE[ds]}`}>
                              {SCHEDULE_STATUS_LABEL[ds]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className="flex gap-1 transition-opacity"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={() => openEdit(item)}
                                className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1"
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                              >
                                刪除
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${item.id}-expand`} className="bg-blue-50 border-b border-blue-100">
                            <td colSpan={6} className="px-8 py-3">
                              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                                <div>
                                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-2">前置工項</span>
                                  <span className="text-gray-700">{dependsOnName || '無'}</span>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-2">備註</span>
                                  <span className="text-gray-700">{item.note || '—'}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">
              {editId ? '編輯工項' : '新增工項'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">工項名稱 *</label>
                <input
                  autoFocus
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.task_name}
                  onChange={e => setForm(f => ({ ...f, task_name: e.target.value }))}
                  placeholder="例：水電配管"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">廠商</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.vendor}
                  onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                  placeholder="例：○○水電行"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">開始日期</label>
                  <input
                    type="date"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">結束日期</label>
                  <input
                    type="date"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">狀態</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as ScheduleStatus }))}
                >
                  <option value="pending">待開始</option>
                  <option value="ongoing">進行中</option>
                  <option value="done">完成</option>
                  <option value="overdue">已逾期</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">前置工項（選填）</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.depends_on}
                  onChange={e => setForm(f => ({ ...f, depends_on: e.target.value }))}
                >
                  <option value="">— 無 —</option>
                  {items
                    .filter(i => i.id !== editId)
                    .map(i => (
                      <option key={i.id} value={i.id}>{i.task_name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={save}
                disabled={!form.task_name || saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
