'use client'

import { useEffect, useState, useRef, useCallback, Fragment } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const POSITIONS = ['店長', '副店長', '經理', '總監', '內勤', '其他']

interface Shareholder {
  id: string
  store_id: string
  number: string | null
  name: string
  store_name: string | null
  store_branch: string | null
  position: string | null
  round1_pct: number | null
  round2_pct: number | null
  round3_pct: number | null
  equity_percent: number | null
  contribution: number | null
  payment_date: string | null
  id_number: string | null
  address: string | null
  email: string | null
  notes: string | null
}

interface BudgetSettings {
  total_budget: number | null
  released_pct: number | null
  ping_count: number | null
  price_per_ping: number | null
}

type ShareholderForm = {
  number: string
  name: string
  store_name: string
  position: string
  id_number: string
  address: string
  email: string
  round1_pct: string
  round2_pct: string
  round3_pct: string
  contribution: string
  payment_date: string
  notes: string
}

function emptyForm(): ShareholderForm {
  return {
    number: '', name: '', store_name: '', position: '',
    id_number: '', address: '', email: '',
    round1_pct: '', round2_pct: '', round3_pct: '',
    contribution: '', payment_date: '', notes: '',
  }
}

function excelDateToString(serial: number): string {
  const d = new Date(Date.UTC(1900, 0, 1) + (serial - 2) * 86400000)
  return d.toISOString().slice(0, 10)
}

export default function ShareholdersPage() {
  const { id } = useParams<{ id: string }>()
  const [shareholders, setShareholders] = useState<Shareholder[]>([])
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ShareholderForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [{ data: shData }, { data: bsData }] = await Promise.all([
      supabase.from('shareholders').select('*').eq('store_id', id).order('number', { ascending: true, nullsFirst: false }),
      supabase.from('budget_settings').select('*').eq('store_id', id).maybeSingle(),
    ])
    setShareholders((shData || []) as Shareholder[])
    setBudgetSettings(bsData as BudgetSettings | null)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // Derived budget values
  const totalBudget = budgetSettings?.total_budget ?? null
  const releasedPct = budgetSettings?.released_pct != null ? budgetSettings.released_pct * 100 : null
  const valuePerPct = totalBudget && releasedPct ? totalBudget / releasedPct : null

  // Auto-calculate equity from form rounds
  const formEquity = (Number(form.round1_pct) || 0) + (Number(form.round2_pct) || 0) + (Number(form.round3_pct) || 0)
  const formContribution = valuePerPct ? Math.round(formEquity * valuePerPct) : null

  // Per-round totals
  const round1Total = shareholders.reduce((s, sh) => s + (sh.round1_pct || 0), 0)
  const round2Total = shareholders.reduce((s, sh) => s + (sh.round2_pct || 0), 0)
  const round3Total = shareholders.reduce((s, sh) => s + (sh.round3_pct || 0), 0)
  const totalEquity = shareholders.reduce((s, sh) => s + (sh.equity_percent || 0), 0)
  const totalContribution = shareholders.reduce((s, sh) => s + (sh.contribution || 0), 0)

  async function save() {
    if (!form.name) return
    setSaving(true)
    const equity = formEquity || (form.round1_pct || form.round2_pct || form.round3_pct ? formEquity : null)
    const payload = {
      store_id: id,
      number: form.number || null,
      name: form.name,
      store_name: form.store_name || null,
      store_branch: null,
      position: form.position || null,
      id_number: form.id_number || null,
      address: form.address || null,
      email: form.email || null,
      round1_pct: form.round1_pct ? Number(form.round1_pct) : null,
      round2_pct: form.round2_pct ? Number(form.round2_pct) : null,
      round3_pct: form.round3_pct ? Number(form.round3_pct) : null,
      equity_percent: equity || null,
      contribution: form.contribution ? Number(form.contribution) : (formContribution ?? null),
      payment_date: form.payment_date || null,
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('shareholders').update(payload).eq('id', editId)
    } else {
      await supabase.from('shareholders').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm())
    load()
  }

  async function deleteShareholder(shId: string) {
    await supabase.from('shareholders').delete().eq('id', shId)
    load()
  }

  function startEdit(s: Shareholder) {
    setForm({
      number: s.number || '',
      name: s.name,
      store_name: s.store_name || s.store_branch || '',
      position: s.position || '',
      id_number: s.id_number || '',
      address: s.address || '',
      email: s.email || '',
      round1_pct: s.round1_pct != null ? String(s.round1_pct) : '',
      round2_pct: s.round2_pct != null ? String(s.round2_pct) : '',
      round3_pct: s.round3_pct != null ? String(s.round3_pct) : '',
      contribution: s.contribution != null ? String(s.contribution) : '',
      payment_date: s.payment_date || '',
      notes: s.notes || '',
    })
    setEditId(s.id)
    setShowAdd(true)
  }

  async function importExcel(file: File) {
    setImporting(true)
    const { read, utils } = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: unknown[][] = utils.sheet_to_json(ws, { header: 1 })

    // Detect header row (look for 姓名)
    let dataStart = 7
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i] as string[]
      if (row.some(c => String(c).includes('姓名'))) { dataStart = i + 1; break }
    }

    const payload: Record<string, unknown>[] = []
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const name = String(row[1] || '').trim()
      if (!name) continue
      const r1 = row[3] != null ? Number(row[3]) : null
      const r2 = row[4] != null ? Number(row[4]) : null
      const r3 = row[5] != null ? Number(row[5]) : null
      const equity = row[6] != null ? Number(row[6]) : ((r1||0)+(r2||0)+(r3||0)) || null
      const paymentSerial = row[8]
      payload.push({
        store_id: id,
        number: String(row[0] || '').trim() || null,
        name,
        store_branch: null,
        position: String(row[2] || '').trim() || null,
        round1_pct: r1,
        round2_pct: r2,
        round3_pct: r3,
        equity_percent: equity,
        contribution: row[7] != null ? Math.round(Number(row[7])) : null,
        payment_date: typeof paymentSerial === 'number' ? excelDateToString(paymentSerial) : null,
        notes: String(row[9] || '').trim() || null,
      })
    }

    if (payload.length > 0) {
      await supabase.from('shareholders').delete().eq('store_id', id)
      await supabase.from('shareholders').insert(payload)
    }
    setImporting(false)
    load()
  }

  async function exportExcel() {
    const { utils, writeFile } = await import('xlsx')
    const rows = shareholders.map(s => ({
      編號: s.number || '',
      姓名: s.name,
      所屬店名: s.store_name || s.store_branch || '',
      職位: s.position || '',
      第一輪認購: s.round1_pct != null ? `${s.round1_pct}%` : '',
      第二輪認購: s.round2_pct != null ? `${s.round2_pct}%` : '',
      第三輪認購: s.round3_pct != null ? `${s.round3_pct}%` : '',
      總持股比例: s.equity_percent != null ? `${s.equity_percent}%` : '',
      應繳總金額: s.contribution || 0,
      繳款日期: s.payment_date || '',
      身分證號碼: s.id_number || '',
      住址: s.address || '',
      信箱: s.email || '',
      備註: s.notes || '',
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '股東名冊')
    writeFile(wb, `股東名冊_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  const remaining = releasedPct ? releasedPct - totalEquity : null

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">股東收款</h1>
          <p className="text-sm text-gray-400 mt-0.5">共 {shareholders.length} 位股東</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) importExcel(f); e.target.value = '' }} />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            {importing ? '匯入中...' : '從 Excel 匯入'}
          </button>
          {shareholders.length > 0 && (
            <button onClick={exportExcel}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              匯出 Excel
            </button>
          )}
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm()) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新增股東
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">募資總金額</p>
          <p className="text-lg font-bold text-gray-900">
            {totalBudget ? `NT$ ${totalBudget.toLocaleString()}` : '未設定'}
          </p>
          {!totalBudget && <p className="text-xs text-gray-400 mt-0.5">請至預算規劃設定</p>}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">已認購總金額</p>
          <p className="text-lg font-bold text-gray-900">NT$ {totalContribution.toLocaleString()}</p>
          {totalBudget && (
            <p className="text-xs text-gray-400 mt-0.5">
              {((totalContribution / totalBudget) * 100).toFixed(1)}% 已到位
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">已釋出股份</p>
          <p className="text-lg font-bold text-blue-700">{totalEquity.toFixed(3)}%</p>
          {remaining !== null && (
            <p className="text-xs text-gray-400 mt-0.5">
              剩餘可釋出 {remaining.toFixed(3)}%
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">每 1% 股份價值</p>
          <p className="text-lg font-bold text-indigo-700">
            {valuePerPct ? `NT$ ${Math.round(valuePerPct).toLocaleString()}` : '-'}
          </p>
          {releasedPct && <p className="text-xs text-gray-400 mt-0.5">釋出比例 {releasedPct}%</p>}
        </div>
      </div>

      {/* Per-round stats */}
      {shareholders.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 px-5 py-4 mb-5">
          <p className="text-xs font-semibold text-blue-700 mb-3">各輪認購統計</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '第一輪', value: round1Total },
              { label: '第二輪', value: round2Total },
              { label: '第三輪', value: round3Total },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-500">{label}已認購</p>
                <p className="text-base font-bold text-gray-800">{value.toFixed(3)}%</p>
                {valuePerPct && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    NT$ {Math.round(value * valuePerPct).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {shareholders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">尚無股東資料</p>
          <p className="text-sm mb-4">可點「從 Excel 匯入」直接匯入股東名冊</p>
          <button onClick={() => fileRef.current?.click()}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            從 Excel 匯入
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['#', '姓名', '職位', '所屬店', '第一輪', '第二輪', '第三輪', '總持股', '應繳金額', '繳款日', ''].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shareholders.map(s => (
                  <Fragment key={s.id}>
                    <tr className="group hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                      <td className="px-3 py-3 text-gray-400 text-xs">{s.number || '-'}</td>
                      <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{s.name}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{s.position || '-'}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{s.store_name || s.store_branch || '-'}</td>
                      <td className="px-3 py-3 text-gray-600 text-center text-xs">
                        {s.round1_pct != null ? `${s.round1_pct}%` : '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-center text-xs">
                        {s.round2_pct != null && s.round2_pct > 0 ? `${s.round2_pct}%` : '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-center text-xs">
                        {s.round3_pct != null && s.round3_pct > 0 ? `${s.round3_pct}%` : '-'}
                      </td>
                      <td className="px-3 py-3 font-semibold text-blue-700 text-center whitespace-nowrap text-xs">
                        {s.equity_percent != null ? `${s.equity_percent}%` : '-'}
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap text-xs">
                        {s.contribution != null ? `NT$ ${s.contribution.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{s.payment_date || '-'}</td>
                      <td className="px-3 py-3">
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); startEdit(s) }}
                            className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                          <button onClick={e => { e.stopPropagation(); deleteShareholder(s.id) }}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === s.id && (
                      <tr className="bg-blue-50/50">
                        <td colSpan={11} className="px-5 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                            <div><span className="text-gray-400">身分證：</span>{s.id_number || '-'}</div>
                            <div><span className="text-gray-400">信箱：</span>{s.email || '-'}</div>
                            <div className="md:col-span-2"><span className="text-gray-400">住址：</span>{s.address || '-'}</div>
                            {s.notes && <div className="md:col-span-4"><span className="text-gray-400">備註：</span>{s.notes}</div>}
                            {valuePerPct && s.equity_percent && (
                              <div className="md:col-span-4 pt-1 border-t border-blue-100 mt-1">
                                <span className="text-gray-400">各輪應繳：</span>
                                {s.round1_pct ? `第一輪 NT$${Math.round(s.round1_pct * valuePerPct).toLocaleString()}` : ''}
                                {s.round2_pct ? `　第二輪 NT$${Math.round(s.round2_pct * valuePerPct).toLocaleString()}` : ''}
                                {s.round3_pct ? `　第三輪 NT$${Math.round(s.round3_pct * valuePerPct).toLocaleString()}` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-3 py-3 font-semibold text-gray-700 text-sm">合計</td>
                  <td className="px-3 py-3 font-bold text-gray-700 text-center text-xs">{round1Total.toFixed(2)}%</td>
                  <td className="px-3 py-3 font-bold text-gray-700 text-center text-xs">{round2Total.toFixed(2)}%</td>
                  <td className="px-3 py-3 font-bold text-gray-700 text-center text-xs">{round3Total.toFixed(3)}%</td>
                  <td className="px-3 py-3 font-bold text-blue-700 text-center text-xs">{totalEquity.toFixed(3)}%</td>
                  <td className="px-3 py-3 font-bold text-gray-900 whitespace-nowrap text-xs">NT$ {totalContribution.toLocaleString()}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-400 px-5 py-2.5 border-t border-gray-100">點擊列可展開查看聯絡資訊</p>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯股東' : '新增股東'}</h2>
            <div className="space-y-4">

              {/* 基本資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">基本資訊</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">編號</label>
                    <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="001" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">姓名 *</label>
                    <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* 服務資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">服務資訊</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">所屬店名</label>
                    <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.store_name} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} placeholder="例：大直讚" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">職位</label>
                    <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
                      <option value="">請選擇</option>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 聯絡資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">聯絡資訊</p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">信箱</label>
                    <input type="email" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@gmail.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">身分證號碼</label>
                    <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} placeholder="A123456789" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">住址</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="台北市..." />
                </div>
              </div>

              {/* 投資資訊 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">投資認購</p>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  {(['round1_pct', 'round2_pct', 'round3_pct'] as const).map((field, i) => (
                    <div key={field}>
                      <label className="text-sm font-medium text-gray-700">第{['一', '二', '三'][i]}輪 (%)</label>
                      <input type="number" step="0.001" min="0"
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form[field]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        placeholder={['1.00', '0.75', '0.079'][i]} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mb-2">填入百分比數值，1% 請填 1.00</p>

                {formEquity > 0 && (
                  <div className="bg-blue-50 rounded-xl px-4 py-2.5 flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">總持股（自動計算）</p>
                      <p className="text-xs text-blue-400">第一 + 第二 + 第三輪</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-blue-700">{formEquity.toFixed(3)}%</p>
                      {formContribution && (
                        <p className="text-xs text-blue-500">應繳 NT$ {formContribution.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      應繳金額
                      {formContribution && <span className="text-xs text-gray-400 ml-1">（自動 {formContribution.toLocaleString()}）</span>}
                    </label>
                    <div className="flex mt-1">
                      <span className="border border-r-0 border-gray-200 rounded-l-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50">NT$</span>
                      <input type="number" min="0"
                        className="flex-1 border border-gray-200 rounded-r-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.contribution}
                        onChange={e => setForm(f => ({ ...f, contribution: e.target.value }))}
                        placeholder={formContribution ? String(formContribution) : '0'} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">繳款日期</label>
                    <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">備註</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowAdd(false); setEditId(null) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={save} disabled={!form.name || saving}
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
