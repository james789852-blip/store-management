'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ScheduleItem {
  id: string
  team: string | null
  task: string
  start_date: string | null
  end_date: string | null
  status: string
  notes: string | null
}

interface Store {
  name: string
  open_date: string | null
}

const STATUS_BG: Record<string, string> = {
  '待開始': '#f3f4f6',
  '進行中': '#dbeafe',
  '延誤': '#fee2e2',
  '完成': '#dcfce7',
}
const STATUS_TEXT: Record<string, string> = {
  '待開始': '#6b7280',
  '進行中': '#1d4ed8',
  '延誤': '#dc2626',
  '完成': '#16a34a',
}

// 取得某月每天的行程
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0=Sun
}

// 把週日改成第 7 天（週一為第一天）
function adjustWeekday(day: number) {
  return day === 0 ? 7 : day
}

export default function SchedulePrintPage() {
  const { id } = useParams<{ id: string }>()
  const [store, setStore] = useState<Store | null>(null)
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: storeData }, { data: scheduleData }] = await Promise.all([
        supabase.from('stores').select('name, open_date').eq('id', id).single(),
        supabase.from('construction_schedule').select('*').eq('store_id', id)
          .not('start_date', 'is', null).order('start_date'),
      ])
      setStore(storeData)
      setItems(scheduleData || [])
      setReady(true)
    }
    load()
  }, [id])

  useEffect(() => {
    if (ready && store) {
      setTimeout(() => window.print(), 800)
    }
  }, [ready, store])

  if (!ready) return <div style={{ padding: 40, color: '#999' }}>載入中...</div>
  if (!store) return <div style={{ padding: 40, color: '#999' }}>找不到店面</div>
  if (items.length === 0) return <div style={{ padding: 40, color: '#999' }}>尚無排程資料</div>

  // 計算要顯示的月份範圍
  const dates = items.flatMap(i => [i.start_date, i.end_date].filter(Boolean) as string[])
  const minDate = dates.reduce((a, b) => a < b ? a : b)
  const maxDate = dates.reduce((a, b) => a > b ? a : b)
  const startMonth = new Date(minDate)
  startMonth.setDate(1)
  const endMonth = new Date(maxDate)

  const months: { year: number; month: number }[] = []
  const cur = new Date(startMonth)
  while (cur <= endMonth) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() })
    cur.setMonth(cur.getMonth() + 1)
  }

  // 取得某天有哪些工程
  function getItemsForDay(dateStr: string): ScheduleItem[] {
    return items.filter(item => {
      const start = item.start_date || '9999'
      const end = item.end_date || item.start_date || '0000'
      return dateStr >= start && dateStr <= end
    })
  }

  const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, 'PingFang TC', sans-serif; background: white; color: #111; }
        .no-print { display: block; }
        @media print {
          .no-print { display: none !important; }
          .month-block { break-inside: avoid; page-break-inside: avoid; }
          body { font-size: 10pt; }
        }
        .container { max-width: 900px; margin: 0 auto; padding: 32px; }
        .top-bar { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
        .print-btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }
        .doc-header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 28px; }
        .doc-title { font-size: 22px; font-weight: 700; }
        .doc-sub { font-size: 13px; color: #6b7280; margin-top: 4px; }
        .month-block { margin-bottom: 32px; }
        .month-title { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 10px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .cal-header { text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af; padding: 4px 0; }
        .cal-cell { min-height: 72px; border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px; background: white; }
        .cal-cell.empty { background: #fafafa; border-color: #f3f4f6; }
        .cal-cell.today { background: #eff6ff; border-color: #bfdbfe; }
        .day-num { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 3px; }
        .day-num.weekend { color: #9ca3af; }
        .event-chip { font-size: 9px; border-radius: 3px; padding: 1px 4px; margin-bottom: 1px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
        .legend { display: flex; gap: 16px; margin-top: 20px; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #374151; }
        .legend-dot { width: 12px; height: 12px; border-radius: 2px; }
        .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
        .item-list { margin-top: 24px; }
        .item-list table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .item-list th { background: #f9fafb; border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; font-weight: 600; color: #374151; }
        .item-list td { border: 1px solid #e5e7eb; padding: 6px 10px; color: #374151; }
      `}</style>

      <div className="container">
        <div className="top-bar no-print">
          <span style={{ fontSize: 13, color: '#6b7280' }}>列印對話框將自動開啟 → 選「儲存為 PDF」即可下載</span>
          <button className="print-btn" onClick={() => window.print()}>重新列印 / 下載 PDF</button>
        </div>

        <div className="doc-header">
          <div className="doc-title">{store.name}｜建置排程行事曆</div>
          <div className="doc-sub">
            共 {items.length} 項工程｜涵蓋 {minDate} 至 {maxDate}
            {store.open_date && `｜預計開幕 ${store.open_date}`}
          </div>
        </div>

        {/* 行事曆 */}
        {months.map(({ year, month }) => {
          const daysInMonth = getDaysInMonth(year, month)
          const firstDay = adjustWeekday(getFirstDayOfMonth(year, month)) // 1=Mon
          const todayStr = new Date().toISOString().slice(0, 10)

          // 建立格子：前面空格 + 日期
          const cells: (number | null)[] = Array(firstDay - 1).fill(null)
          for (let d = 1; d <= daysInMonth; d++) cells.push(d)
          // 補齊到 7 的倍數
          while (cells.length % 7 !== 0) cells.push(null)

          const monthStr = `${year}年${month + 1}月`

          return (
            <div key={`${year}-${month}`} className="month-block">
              <div className="month-title">{monthStr}</div>
              <div className="cal-grid">
                {WEEKDAYS.map(w => (
                  <div key={w} className="cal-header">{w}</div>
                ))}
                {cells.map((day, idx) => {
                  if (day === null) return <div key={idx} className="cal-cell empty" />
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayItems = getItemsForDay(dateStr)
                  const isToday = dateStr === todayStr
                  const weekday = (idx % 7) + 1 // 1=Mon, 7=Sun
                  const isWeekend = weekday >= 6

                  return (
                    <div key={idx} className={`cal-cell ${isToday ? 'today' : ''}`}>
                      <div className={`day-num ${isWeekend ? 'weekend' : ''}`}>
                        {day}
                        {isToday && <span style={{ fontSize: 8, color: '#2563eb', marginLeft: 2 }}>今</span>}
                      </div>
                      {dayItems.map(item => (
                        <div key={item.id} className="event-chip"
                          style={{
                            background: STATUS_BG[item.status] || '#f3f4f6',
                            color: STATUS_TEXT[item.status] || '#374151',
                          }}
                          title={`${item.task}${item.team ? ` (${item.team})` : ''}`}>
                          {item.team ? `[${item.team}] ` : ''}{item.task}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* 工程列表 */}
        <div className="item-list">
          <div className="month-title" style={{ marginBottom: 10 }}>工程項目一覽</div>
          <table>
            <thead>
              <tr>
                <th>工班 / 廠商</th>
                <th>工程項目</th>
                <th>開始日期</th>
                <th>完成日期</th>
                <th>天數</th>
                <th>狀態</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const duration = item.start_date && item.end_date
                  ? Math.ceil((new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / 86400000) + 1
                  : null
                return (
                  <tr key={item.id}>
                    <td>{item.team || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{item.task}</td>
                    <td>{item.start_date || '-'}</td>
                    <td>{item.end_date || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{duration ? `${duration} 天` : '-'}</td>
                    <td>
                      <span style={{
                        background: STATUS_BG[item.status] || '#f3f4f6',
                        color: STATUS_TEXT[item.status] || '#374151',
                        padding: '1px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600
                      }}>{item.status}</span>
                    </td>
                    <td style={{ color: '#6b7280' }}>{item.notes || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 圖例 */}
        <div className="legend">
          {Object.entries(STATUS_BG).map(([status, bg]) => (
            <div key={status} className="legend-item">
              <div className="legend-dot" style={{ background: bg, border: '1px solid #e5e7eb' }} />
              <span style={{ color: STATUS_TEXT[status] }}>{status}</span>
            </div>
          ))}
        </div>

        <div className="footer">
          {store.name}｜建置排程行事曆｜產製於 {new Date().toLocaleDateString('zh-TW')}
        </div>
      </div>
    </>
  )
}
