'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Shareholder {
  id: string
  store_id: string
  number: string | null
  name: string
  store_branch: string | null
  round1_pct: number | null
  round2_pct: number | null
  round3_pct: number | null
  equity_percent: number | null
  contribution: number | null
  payment_date: string | null
  notes: string | null
}

function emptyForm() {
  return {
    number: '', name: '', store_branch: '',
    round1_pct: '', round2_pct: '', round3_pct: '',
    equity_percent: '', contribution: '', payment_date: '', notes: ''
  }
}

function excelDateToString(serial: number): string {
  const d = new Date(Date.UTC(1900, 0, 1) + (serial - 2) * 86400000)
  return d.toISOString().slice(0, 10)
}

export default function ShareholdersPage() {
  const { id } = useParams<{ id: string }>()
  const [shareholders, setShareholders] = useState<Shareholder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('shareholders').select('*').eq('store_id', id).order('number', { ascending: true, nullsFirst: false })
    setShareholders((data || []) as Shareholder[])
    setLoading(false)
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = {
      store_id: id,
      number: form.number || null,
      name: form.name,
      store_branch: form.store_branch || null,
      round1_pct: form.round1_pct ? Number(form.round1_pct) : null,
      round2_pct: form.round2_pct ? Number(form.round2_pct) : null,
      round3_pct: form.round3_pct ? Number(form.round3_pct) : null,
      equity_percent: form.equity_percent ? Number(form.equity_percent) : null,
      contribution: form.contribution ? Number(form.contribution) : null,
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
      number: s.number || '', name: s.name, store_branch: s.store_branch || '',
      round1_pct: s.round1_pct !== null ? String((s.round1_pct * 100).toFixed(4)) : '',
      round2_pct: s.round2_pct !== null ? String((s.round2_pct * 100).toFixed(4)) : '',
      round3_pct: s.round3_pct !== null ? String((s.round3_pct * 100).toFixed(4)) : '',
      equity_percent: s.equity_percent !== null ? String((s.equity_percent * 100).toFixed(4)) : '',
      contribution: s.contribution !== null ? String(s.contribution) : '',
      payment_date: s.payment_date || '', notes: s.notes || '',
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

    const payload: Record<string, unknown>[] = []
    for (let i = 5; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const name = row[1] as string | null
      if (!name || name.trim() === '') continue
      const paymentSerial = row[8]
      payload.push({
        store_id: id,
        number: String(row[0] || '').trim(),
        name: name.trim(),
        store_branch: String(row[2] || '').trim() || null,
        round1_pct: row[3] != null ? Number(row[3]) : null,
        round2_pct: row[4] != null ? Number(row[4]) : null,
        round3_pct: row[5] != null ? Number(row[5]) : null,
        equity_percent: row[6] != null ? Number(row[6]) : null,
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

  const totalContribution = shareholders.reduce((s, sh) => s + (sh.contribution || 0), 0)
  const totalEquity = shareholders.reduce((s, sh) => s + (sh.equity_percent || 0), 0)

  async function exportExcel() {
    const { utils, writeFile } = await import('xlsx')
    const rows = shareholders.map(s => ({
      編號: s.number || '',
      姓名: s.name,
      服務分店職稱: s.store_branch || '',
      第一輪認購: s.round1_pct != null ? `${(s.round1_pct * 100).toFixed(2)}%` : '',
      第二輪認購: s.round2_pct != null ? `${(s.round2_pct * 100).toFixed(2)}%` : '',
      第三輪認購: s.round3_pct != null ? `${(s.round3_pct * 100).toFixed(2)}%` : '',
      總持股比例: s.equity_percent != null ? `${(s.equity_percent * 100).toFixed(4)}%` : '',
      應繳總金額: s.contribution || 0,
      繳款日期: s.payment_date || '',
      備註: s.notes || '',
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '股東名冊')
    writeFile(wb, `股東名冊_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-5xl">
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">已認購總金額</p>
          <p className="text-xl font-bold text-gray-900">NT$ {totalContribution.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">已釋出股份</p>
          <p className="text-xl font-bold text-gray-900">{(totalEquity * 100).toFixed(2)}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">股東人數</p>
          <p className="text-xl font-bold text-gray-900">{shareholders.length} 人</p>
        </div>
      </div>

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
                  {['#', '姓名', '服務分店/職稱', '第一輪', '第二輪', '第三輪', '總持股', '應繳金額', '繳款日', '備註', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shareholders.map(s => (
                  <tr key={s.id} className="group hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{s.number || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.store_branch || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">
                      {s.round1_pct != null ? `${(s.round1_pct * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">
                      {s.round2_pct != null && s.round2_pct > 0 ? `${(s.round2_pct * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">
                      {s.round3_pct != null && s.round3_pct > 0 ? `${(s.round3_pct * 100).toFixed(3)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-700 text-center whitespace-nowrap">
                      {s.equity_percent != null ? `${(s.equity_percent * 100).toFixed(3)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {s.contribution != null ? `NT$ ${s.contribution.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.payment_date || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{s.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button onClick={() => startEdit(s)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                        <button onClick={() => deleteShareholder(s.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 font-semibold text-gray-700">合計</td>
                  <td className="px-4 py-3 font-bold text-blue-700 text-center">{(totalEquity * 100).toFixed(3)}%</td>
                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">NT$ {totalContribution.toLocaleString()}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯股東' : '新增股東'}</h2>
            <div className="space-y-3">
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
              <div>
                <label className="text-sm font-medium text-gray-700">服務分店 / 職稱</label>
                <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.store_branch} onChange={e => setForm(f => ({ ...f, store_branch: e.target.value }))} placeholder="例：大直讚/副店長" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">第一輪 (%)</label>
                  <input type="number" step="0.001" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.round1_pct} onChange={e => setForm(f => ({ ...f, round1_pct: e.target.value }))} placeholder="1.00" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">第二輪 (%)</label>
                  <input type="number" step="0.001" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.round2_pct} onChange={e => setForm(f => ({ ...f, round2_pct: e.target.value }))} placeholder="0.75" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">第三輪 (%)</label>
                  <input type="number" step="0.001" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.round3_pct} onChange={e => setForm(f => ({ ...f, round3_pct: e.target.value }))} placeholder="0.079" />
                </div>
              </div>
              <p className="text-xs text-gray-400">請填入百分比數值，例如 1% 請填 1.00</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">總持股比例 (%)</label>
                  <input type="number" step="0.001" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.equity_percent} onChange={e => setForm(f => ({ ...f, equity_percent: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">應繳總金額</label>
                  <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.contribution} onChange={e => setForm(f => ({ ...f, contribution: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">繳款日期</label>
                <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
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
