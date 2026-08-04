'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ConstructionLog, LogStatus } from '@/types'
import { LOG_STATUS_LABEL } from '@/types'
import { LOG_BADGE, LOG_PROGRESS_BAR } from '@/lib/colors'
import FileUploader from '@/components/FileUploader'

const TODAY = new Date().toISOString().slice(0, 10)
const THIS_MONTH = new Date().toISOString().slice(0, 7)


// Dot colour on the timeline / card left border
const STATUS_DOT: Record<LogStatus, string> = {
  normal: 'bg-green-400',
  issue:  'bg-red-400',
  nowork: 'bg-gray-400',
}

const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: '全部',   label: '全部'   },
  { key: 'normal', label: '正常'   },
  { key: 'issue',  label: '異常'   },
  { key: 'nowork', label: '停工'   },
]

type LogForm = {
  date:      string
  weather:   string
  task_name: string
  vendor:    string
  workers:   string
  status:    LogStatus
  progress:  string
  issue:     string
  action:    string
  note:      string
  photos:    string[]
}

function emptyForm(): LogForm {
  return {
    date:      TODAY,
    weather:   '',
    task_name: '',
    vendor:    '',
    workers:   '',
    status:    'normal',
    progress:  '',
    issue:     '',
    action:    '',
    note:      '',
    photos:    [],
  }
}

const INPUT =
  'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function LogPage() {
  const { id } = useParams<{ id: string }>()

  const [logs,       setLogs]       = useState<ConstructionLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('全部')
  const [month,      setMonth]      = useState('')          // '' = 不篩選
  const [showModal,  setShowModal]  = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [form,       setForm]       = useState<LogForm>(emptyForm())
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { load() }, [id])

  // ── Data ───────────────────────────────────────────────────────────────
  async function load() {
    const { data } = await supabase
      .from('construction_logs')
      .select('*')
      .eq('store_id', id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.date) return
    setSaving(true)
    const payload = {
      store_id:  id,
      date:      form.date,
      weather:   form.weather   || null,
      task_name: form.task_name || null,
      vendor:    form.vendor    || null,
      workers:   form.workers   ? Number(form.workers) : null,
      status:    form.status,
      progress:  form.progress  || null,
      issue:     form.status === 'issue' ? (form.issue   || null) : null,
      action:    form.status === 'issue' ? (form.action  || null) : null,
      photos:    form.photos,
      note:      form.note      || null,
    }
    if (editId) {
      await supabase.from('construction_logs').update(payload).eq('id', editId)
    } else {
      await supabase.from('construction_logs').insert(payload)
    }
    setSaving(false)
    closeModal()
    load()
  }

  async function deleteLog(logId: string) {
    if (!confirm('確定要刪除這筆日誌？')) return
    await supabase.from('construction_logs').delete().eq('id', logId)
    load()
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = filtered.map(l => ({
      日期: l.date,
      天氣: l.weather || '',
      工項名稱: l.task_name || '',
      廠商: l.vendor || '',
      到場人數: l.workers ?? '',
      狀態: LOG_STATUS_LABEL[l.status],
      今日進度: l.progress || '',
      異常說明: l.issue || '',
      處理措施: l.action || '',
      備註: l.note || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '施工日誌')
    XLSX.writeFile(wb, `施工日誌_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Modal helpers ──────────────────────────────────────────────────────
  function openAdd() {
    setForm(emptyForm())
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(log: ConstructionLog) {
    setForm({
      date:      log.date,
      weather:   log.weather   ?? '',
      task_name: log.task_name ?? '',
      vendor:    log.vendor    ?? '',
      workers:   log.workers   !== null ? String(log.workers) : '',
      status:    log.status,
      progress:  log.progress  ?? '',
      issue:     log.issue     ?? '',
      action:    log.action    ?? '',
      note:      log.note      ?? '',
      photos:    log.photos    || [],
    })
    setEditId(log.id)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm())
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const filtered = logs.filter(log => {
    const statusOk = filter === '全部' || log.status === filter
    const monthOk  = !month  || log.date.startsWith(month)
    return statusOk && monthOk
  })

  const issueCount  = logs.filter(l => l.status === 'issue').length
  const noworkCount = logs.filter(l => l.status === 'nowork').length

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        載入中...
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">施工日誌</h1>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-400">
              <span>共 {logs.length} 筆記錄</span>
              {issueCount > 0 && (
                <span className="text-red-500 font-medium">異常 {issueCount}</span>
              )}
              {noworkCount > 0 && (
                <span className="text-gray-500 font-medium">停工 {noworkCount}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {logs.length > 0 && (
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
              + 新增日誌
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Status tabs */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Month picker */}
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="border border-gray-200 bg-white rounded-xl px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {month && (
              <button
                onClick={() => setMonth('')}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
              >
                清除
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {logs.length === 0 ? (
          /* Empty state — no records at all */
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium text-gray-600 mb-1">尚無施工日誌</p>
            <p className="text-sm mb-6">每天記錄施工進度，完整保留建置過程</p>
            <button
              onClick={openAdd}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              新增第一筆日誌
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state — filters yield nothing */
          <div className="text-center py-20 text-gray-400">
            <p className="text-sm">沒有符合條件的日誌</p>
          </div>
        ) : (
          /* Log cards */
          <div className="space-y-4">
            {filtered.map(log => (
              <LogCard
                key={log.id}
                log={log}
                onEdit={() => openEdit(log)}
                onDelete={() => deleteLog(log.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">
              {editId ? '編輯日誌' : '新增施工日誌'}
            </h2>

            <div className="space-y-4">
              {/* Date + Weather */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">日期 *</label>
                  <input
                    type="date"
                    className={INPUT}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">天氣</label>
                  <input
                    className={INPUT}
                    value={form.weather}
                    onChange={e => setForm(f => ({ ...f, weather: e.target.value }))}
                    placeholder="例：晴、雨"
                  />
                </div>
              </div>

              {/* Task + Vendor */}
              <div>
                <label className="text-sm font-medium text-gray-700">工項名稱</label>
                <input
                  autoFocus
                  className={INPUT}
                  value={form.task_name}
                  onChange={e => setForm(f => ({ ...f, task_name: e.target.value }))}
                  placeholder="例：廚房水電配管"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">廠商 / 工班</label>
                  <input
                    className={INPUT}
                    value={form.vendor}
                    onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                    placeholder="例：○○水電行"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">到場人數</label>
                  <input
                    type="number"
                    min="0"
                    className={INPUT}
                    value={form.workers}
                    onChange={e => setForm(f => ({ ...f, workers: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-700">施工狀態</label>
                <select
                  className={INPUT}
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as LogStatus }))}
                >
                  <option value="normal">正常</option>
                  <option value="issue">異常</option>
                  <option value="nowork">停工</option>
                </select>
              </div>

              {/* Progress */}
              <div>
                <label className="text-sm font-medium text-gray-700">今日施工進度</label>
                <textarea
                  rows={4}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.progress}
                  onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
                  placeholder="例：完成廚房設備定位，開始配管"
                />
              </div>

              {/* Issue fields — only when status = issue */}
              {form.status === 'issue' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-red-600">異常說明</label>
                    <textarea
                      rows={3}
                      className="mt-1 w-full border border-red-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                      value={form.issue}
                      onChange={e => setForm(f => ({ ...f, issue: e.target.value }))}
                      placeholder="描述發生的問題..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-blue-600">處理措施</label>
                    <textarea
                      rows={3}
                      className="mt-1 w-full border border-blue-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      value={form.action}
                      onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
                      placeholder="說明已採取或計劃的處理方式..."
                    />
                  </div>
                </>
              )}

              {/* Note */}
              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <textarea
                  rows={2}
                  className={`${INPUT} resize-none`}
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>

              {/* Photos */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">現場照片</label>
                <FileUploader
                  folderPath={`logs/${id}`}
                  value={form.photos}
                  onChange={photos => setForm(f => ({ ...f, photos }))}
                  multiple
                  accept="image/*"
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
                disabled={!form.date || saving}
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

// ── LogCard component ──────────────────────────────────────────────────────
function LogCard({
  log,
  onEdit,
  onDelete,
}: {
  log: ConstructionLog
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 group hover:shadow-sm transition-shadow">
      {/* Top row: date + meta + badge + actions */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Large date */}
          <span className="text-xl font-bold text-gray-800 tabular-nums">{log.date}</span>

          {/* Weather */}
          {log.weather && (
            <span className="text-sm text-gray-500">{log.weather}</span>
          )}

          {/* Workers */}
          {log.workers !== null && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {log.workers} 人到場
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status badge */}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${LOG_BADGE[log.status]}`}>
            {LOG_STATUS_LABEL[log.status]}
          </span>

          {/* Edit / Delete — visible on hover */}
          <div className="flex gap-1 transition-opacity">
            <button
              onClick={onEdit}
              className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1"
            >
              編輯
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
            >
              刪除
            </button>
          </div>
        </div>
      </div>

      {/* Task + Vendor */}
      {(log.task_name || log.vendor) && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {log.task_name && (
            <span className="text-sm font-medium text-gray-700">{log.task_name}</span>
          )}
          {log.vendor && (
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
              {log.vendor}
            </span>
          )}
        </div>
      )}

      {/* Progress text */}
      {log.progress && (
        <div className="mb-3 bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-xs text-gray-400 mb-0.5">今日進度</p>
          <p className="text-sm text-gray-700">{log.progress}</p>
        </div>
      )}

      {/* Issue box */}
      {log.status === 'issue' && log.issue && (
        <div className="mb-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-red-500 mb-1">異常說明</p>
          <p className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed">{log.issue}</p>
        </div>
      )}

      {/* Action box */}
      {log.status === 'issue' && log.action && (
        <div className="mb-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue-500 mb-1">處理措施</p>
          <p className="text-sm text-blue-700 whitespace-pre-wrap leading-relaxed">{log.action}</p>
        </div>
      )}

      {/* Photos */}
      {log.photos?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <LogPhotoStrip photos={log.photos} />
        </div>
      )}

      {/* Note */}
      {log.note && (
        <p className="text-xs text-gray-400 mt-2 pt-3 border-t border-gray-100 whitespace-pre-wrap leading-relaxed">
          {log.note}
        </p>
      )}
    </div>
  )
}

function LogPhotoStrip({ photos }: { photos: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {photos.map(url => (
          <img
            key={url}
            src={url}
            alt=""
            onClick={() => setLightbox(url)}
            className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
          />
        ))}
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-xl w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
