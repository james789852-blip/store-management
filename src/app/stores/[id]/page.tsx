'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Store, ConstructionProgress, Expense, Equipment, Todo, Shareholder, Contract } from '@/types'
import Link from 'next/link'

const TABS = ['總覽', '建置進度', '費用明細', '設備規格', '股東管理', '合約管理', '待辦清單']

const TEAMS = ['水電', '木工', '輕鋼架', '泥作', '磁磚', '鐵工', '冷氣', '瓦斯', '油漆', '招牌', '監視器', '中華電信', '其他']

function fmt(d: string | null) {
  if (!d) return '-'
  return d.replace(/-/g, '/')
}

export default function StorePage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.id as string

  const [store, setStore] = useState<Store | null>(null)
  const [tab, setTab] = useState('總覽')
  const [progress, setProgress] = useState<ConstructionProgress[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [shareholders, setShareholders] = useState<Shareholder[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [storeId])

  async function loadAll() {
    const [s, p, e, eq, t, sh, c] = await Promise.all([
      supabase.from('stores').select('*').eq('id', storeId).single(),
      supabase.from('construction_progress').select('*').eq('store_id', storeId).order('start_date'),
      supabase.from('expenses').select('*').eq('store_id', storeId).order('date', { ascending: false }),
      supabase.from('equipment').select('*').eq('store_id', storeId).order('category'),
      supabase.from('todos').select('*').eq('store_id', storeId).order('due_date'),
      supabase.from('shareholders').select('*').eq('store_id', storeId),
      supabase.from('contracts').select('*').eq('store_id', storeId).order('end_date'),
    ])
    setStore(s.data)
    setProgress(p.data || [])
    setExpenses(e.data || [])
    setEquipment(eq.data || [])
    setTodos(t.data || [])
    setShareholders(sh.data || [])
    setContracts(c.data || [])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">載入中...</div>
  if (!store) return <div className="flex items-center justify-center min-h-screen text-gray-400">找不到店面</div>

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const unpaidExpenses = expenses.filter(e => e.payment_status === '未結清').reduce((s, e) => s + e.amount, 0)
  const totalEquity = shareholders.reduce((s, sh) => s + sh.equity_percent, 0)
  const totalContribution = shareholders.reduce((s, sh) => s + sh.contribution, 0)
  const pendingTodos = todos.filter(t => t.status !== '完成').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-blue-600">首頁</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{store.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
              {store.address && <p className="text-sm text-gray-500 mt-0.5">{store.address}</p>}
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${
              store.status === '營運中' ? 'bg-green-100 text-green-800' :
              store.status === '建置中' ? 'bg-blue-100 text-blue-800' :
              store.status === '試營運' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
            }`}>{store.status}</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {tab === '總覽' && <Overview store={store} totalExpenses={totalExpenses} unpaidExpenses={unpaidExpenses} pendingTodos={pendingTodos} totalContribution={totalContribution} totalEquity={totalEquity} progressCount={progress.length} onUpdate={loadAll} />}
        {tab === '建置進度' && <ProgressTab storeId={storeId} data={progress} onUpdate={loadAll} />}
        {tab === '費用明細' && <ExpensesTab storeId={storeId} data={expenses} onUpdate={loadAll} />}
        {tab === '設備規格' && <EquipmentTab storeId={storeId} data={equipment} onUpdate={loadAll} />}
        {tab === '股東管理' && <ShareholdersTab storeId={storeId} data={shareholders} onUpdate={loadAll} />}
        {tab === '合約管理' && <ContractsTab storeId={storeId} data={contracts} onUpdate={loadAll} />}
        {tab === '待辦清單' && <TodosTab storeId={storeId} data={todos} onUpdate={loadAll} />}
      </main>
    </div>
  )
}

// ── 總覽 ──────────────────────────────────────────
function Overview({ store, totalExpenses, unpaidExpenses, pendingTodos, totalContribution, totalEquity, progressCount, onUpdate }: {
  store: Store, totalExpenses: number, unpaidExpenses: number, pendingTodos: number,
  totalContribution: number, totalEquity: number, progressCount: number, onUpdate: () => void
}) {
  const days = store.open_date ? Math.ceil((new Date(store.open_date).getTime() - Date.now()) / 86400000) : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="總費用" value={`NT$ ${totalExpenses.toLocaleString()}`} sub={`未結清 ${unpaidExpenses.toLocaleString()}`} color="blue" />
        <StatCard label="待辦事項" value={`${pendingTodos} 項`} color="orange" />
        <StatCard label="工程項目" value={`${progressCount} 項`} color="purple" />
        {days !== null ? (
          <StatCard label={days < 0 ? '已開幕' : '距開幕'} value={`${Math.abs(days)} 天`} color={days < 0 ? 'green' : days <= 30 ? 'red' : 'blue'} />
        ) : (
          <StatCard label="股東總出資" value={`NT$ ${totalContribution.toLocaleString()}`} sub={`${totalEquity}% 股份`} color="green" />
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">基本資訊</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <InfoRow label="建置開始日" value={fmt(store.start_date)} />
          <InfoRow label="預計開幕日" value={fmt(store.open_date)} />
          <InfoRow label="月租金" value={store.rent ? `NT$ ${store.rent.toLocaleString()}` : '-'} />
          <InfoRow label="坪數" value={store.area ? `${store.area} 坪` : '-'} />
          <InfoRow label="狀態" value={store.status} />
        </div>
        {store.notes && <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{store.notes}</p>}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string, value: string, sub?: string, color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700', orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700', green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color] || colors.blue}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}</span>
      <p className="font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

// ── 建置進度 ──────────────────────────────────────
function ProgressTab({ storeId, data, onUpdate }: { storeId: string, data: ConstructionProgress[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ team: '水電', task: '', start_date: '', end_date: '', status: '待進場', notes: '' })
  const [saving, setSaving] = useState(false)

  async function add() {
    setSaving(true)
    await supabase.from('construction_progress').insert({ store_id: storeId, ...form, start_date: form.start_date || null, end_date: form.end_date || null })
    setShowAdd(false)
    setSaving(false)
    onUpdate()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('construction_progress').update({ status }).eq('id', id)
    onUpdate()
  }

  const statusBadge: Record<string, string> = {
    '待進場': 'bg-gray-100 text-gray-600',
    '進行中': 'bg-blue-100 text-blue-700',
    '完成': 'bg-green-100 text-green-700',
    '延誤': 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">工程進度 ({data.length})</h3>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
      </div>

      {data.length === 0 ? (
        <p className="text-center py-12 text-gray-400">尚無工程進度記錄</p>
      ) : (
        <div className="space-y-2">
          {data.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{p.team}</span>
                  {p.task && <span className="text-sm text-gray-500">— {p.task}</span>}
                </div>
                {(p.start_date || p.end_date) && (
                  <p className="text-xs text-gray-400 mt-1">{fmt(p.start_date)} ～ {fmt(p.end_date)}</p>
                )}
              </div>
              <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${statusBadge[p.status]}`}>
                {['待進場', '進行中', '完成', '延誤'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="新增工程進度" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 font-medium">工班 *</label>
              <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))}>
                {TEAMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium">工項說明</label>
              <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">進場日期</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">預計完成</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <ModalFooter onClose={() => setShowAdd(false)} onSave={add} saving={saving} disabled={!form.team} />
        </Modal>
      )}
    </div>
  )
}

// ── 費用明細 ──────────────────────────────────────
function ExpensesTab({ storeId, data, onUpdate }: { storeId: string, data: Expense[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '', vendor: '', buyer: '', quantity: '1', amount: '',
    payment_stage: '', payment_method: '', invoice_type: '收據', notes: ''
  })
  const [saving, setSaving] = useState(false)

  async function add() {
    setSaving(true)
    await supabase.from('expenses').insert({
      store_id: storeId, ...form,
      quantity: Number(form.quantity), amount: Number(form.amount),
      payment_status: '未結清', reimbursed: false,
    })
    setShowAdd(false)
    setSaving(false)
    onUpdate()
  }

  async function toggleStatus(id: string, current: string) {
    await supabase.from('expenses').update({ payment_status: current === '已結清' ? '未結清' : '已結清' }).eq('id', id)
    onUpdate()
  }

  const total = data.reduce((s, e) => s + e.amount, 0)
  const unpaid = data.filter(e => e.payment_status === '未結清').reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">費用明細 ({data.length})</h3>
          <p className="text-sm text-gray-500">合計 NT$ {total.toLocaleString()} ｜ 未結清 NT$ {unpaid.toLocaleString()}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
      </div>

      {data.length === 0 ? (
        <p className="text-center py-12 text-gray-400">尚無費用記錄</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">日期</th>
                <th className="px-4 py-3 text-left">項目</th>
                <th className="px-4 py-3 text-left">廠商</th>
                <th className="px-4 py-3 text-left">付款人</th>
                <th className="px-4 py-3 text-right">金額</th>
                <th className="px-4 py-3 text-center">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{fmt(e.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.item}</td>
                  <td className="px-4 py-3 text-gray-500">{e.vendor || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.buyer || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">NT$ {e.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleStatus(e.id, e.payment_status)}
                      className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer
                        ${e.payment_status === '已結清' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {e.payment_status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="新增費用" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">日期 *</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">憑證類型</label>
                <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.invoice_type} onChange={e => setForm(f => ({ ...f, invoice_type: e.target.value }))}>
                  {['估價單', '收據', '發票', '其他'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium">項目 *</label>
              <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">廠商</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">付款人</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.buyer} onChange={e => setForm(f => ({ ...f, buyer: e.target.value }))} placeholder="誰先付款" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">金額 *</label>
                <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">付款方式</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="現金/轉帳..." />
              </div>
            </div>
          </div>
          <ModalFooter onClose={() => setShowAdd(false)} onSave={add} saving={saving} disabled={!form.item || !form.amount} />
        </Modal>
      )}
    </div>
  )
}

// ── 設備規格 ──────────────────────────────────────
function EquipmentTab({ storeId, data, onUpdate }: { storeId: string, data: Equipment[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ category: '', name: '', brand: '', model: '', size: '', power: '', condition: '全新', quantity: '1', price: '', arrival_date: '', warranty_expire: '' })
  const [saving, setSaving] = useState(false)

  async function add() {
    setSaving(true)
    await supabase.from('equipment').insert({
      store_id: storeId, ...form,
      quantity: Number(form.quantity),
      price: form.price ? Number(form.price) : null,
      arrival_date: form.arrival_date || null,
      warranty_expire: form.warranty_expire || null,
    })
    setShowAdd(false)
    setSaving(false)
    onUpdate()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">設備規格 ({data.length})</h3>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
      </div>

      {data.length === 0 ? (
        <p className="text-center py-12 text-gray-400">尚無設備記錄</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">類別</th>
                <th className="px-4 py-3 text-left">名稱</th>
                <th className="px-4 py-3 text-left">品牌/型號</th>
                <th className="px-4 py-3 text-left">電壓</th>
                <th className="px-4 py-3 text-center">數量</th>
                <th className="px-4 py-3 text-right">單價</th>
                <th className="px-4 py-3 text-center">新舊</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(eq => (
                <tr key={eq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{eq.category || '-'}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{eq.name}</td>
                  <td className="px-4 py-3 text-gray-500">{[eq.brand, eq.model].filter(Boolean).join(' / ') || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{eq.power || '-'}</td>
                  <td className="px-4 py-3 text-center">{eq.quantity}</td>
                  <td className="px-4 py-3 text-right">{eq.price ? `NT$ ${eq.price.toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${eq.condition === '全新' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {eq.condition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="新增設備" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">類別</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="餐飲設備/家具..." />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">設備名稱 *</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">品牌</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">型號</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">電壓</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.power} onChange={e => setForm(f => ({ ...f, power: e.target.value }))} placeholder="110V/220V" />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">數量</label>
                <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">新舊</label>
                <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                  <option>全新</option><option>二手</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">單價</label>
                <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">到貨日期</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.arrival_date} onChange={e => setForm(f => ({ ...f, arrival_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <ModalFooter onClose={() => setShowAdd(false)} onSave={add} saving={saving} disabled={!form.name} />
        </Modal>
      )}
    </div>
  )
}

// ── 股東管理 ──────────────────────────────────────
function ShareholdersTab({ storeId, data, onUpdate }: { storeId: string, data: Shareholder[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', contribution: '', equity_percent: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function add() {
    setSaving(true)
    await supabase.from('shareholders').insert({
      store_id: storeId, name: form.name,
      contribution: Number(form.contribution),
      equity_percent: Number(form.equity_percent),
      notes: form.notes || null,
    })
    setShowAdd(false)
    setSaving(false)
    onUpdate()
  }

  const totalContribution = data.reduce((s, d) => s + d.contribution, 0)
  const totalEquity = data.reduce((s, d) => s + d.equity_percent, 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">股東管理 ({data.length} 位)</h3>
          <p className="text-sm text-gray-500">總出資 NT$ {totalContribution.toLocaleString()} ｜ 總股份 {totalEquity}%</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">
        <strong>股份規則：</strong>投資人合計持有 30% 股份。例如開店成本 NT$1,000,000，投資人出資 NT$1,000,000 可得 30%；公司持有 70%。
      </div>

      {data.length === 0 ? (
        <p className="text-center py-12 text-gray-400">尚無股東資料</p>
      ) : (
        <div className="space-y-3">
          {data.map(sh => (
            <div key={sh.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{sh.name}</p>
                  {sh.notes && <p className="text-sm text-gray-500 mt-0.5">{sh.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">NT$ {sh.contribution.toLocaleString()}</p>
                  <p className="text-sm text-blue-600 font-medium">{sh.equity_percent}% 股份</p>
                </div>
              </div>
              {totalContribution > 0 && (
                <div className="mt-3">
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(sh.contribution / totalContribution) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="新增股東" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 font-medium">姓名 *</label>
              <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">出資金額 (NT$) *</label>
                <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.contribution} onChange={e => setForm(f => ({ ...f, contribution: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">股份比例 (%)</label>
                <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.equity_percent} onChange={e => setForm(f => ({ ...f, equity_percent: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium">備註</label>
              <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <ModalFooter onClose={() => setShowAdd(false)} onSave={add} saving={saving} disabled={!form.name || !form.contribution} />
        </Modal>
      )}
    </div>
  )
}

// ── 合約管理 ──────────────────────────────────────
function ContractsTab({ storeId, data, onUpdate }: { storeId: string, data: Contract[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: '租約', name: '', start_date: '', end_date: '', amount: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function add() {
    setSaving(true)
    await supabase.from('contracts').insert({
      store_id: storeId, ...form,
      amount: form.amount ? Number(form.amount) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })
    setShowAdd(false)
    setSaving(false)
    onUpdate()
  }

  function daysUntilExpiry(dateStr: string | null) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">合約管理 ({data.length})</h3>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
      </div>

      {data.length === 0 ? (
        <p className="text-center py-12 text-gray-400">尚無合約記錄</p>
      ) : (
        <div className="space-y-3">
          {data.map(c => {
            const days = daysUntilExpiry(c.end_date)
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.type}</span>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{fmt(c.start_date)} ～ {fmt(c.end_date)}</p>
                  </div>
                  <div className="text-right">
                    {c.amount && <p className="font-medium text-gray-700">NT$ {c.amount.toLocaleString()}</p>}
                    {days !== null && (
                      <p className={`text-xs mt-1 ${days < 30 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {days < 0 ? '已到期' : `${days} 天後到期`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="新增合約" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">類型</label>
                <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['租約', '廠商合約', '保險', '其他'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">合約名稱 *</label>
                <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">起始日</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">到期日</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium">金額</label>
              <input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <ModalFooter onClose={() => setShowAdd(false)} onSave={add} saving={saving} disabled={!form.name} />
        </Modal>
      )}
    </div>
  )
}

// ── 待辦清單 ──────────────────────────────────────
function TodosTab({ storeId, data, onUpdate }: { storeId: string, data: Todo[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: '中', category: '其他' })
  const [saving, setSaving] = useState(false)

  async function add() {
    setSaving(true)
    await supabase.from('todos').insert({
      store_id: storeId, ...form,
      due_date: form.due_date || null,
      status: '待辦',
    })
    setShowAdd(false)
    setSaving(false)
    onUpdate()
  }

  async function toggleDone(id: string, current: string) {
    await supabase.from('todos').update({ status: current === '完成' ? '待辦' : '完成' }).eq('id', id)
    onUpdate()
  }

  const priorityBadge: Record<string, string> = {
    '高': 'bg-red-100 text-red-700', '中': 'bg-yellow-100 text-yellow-700', '低': 'bg-gray-100 text-gray-600'
  }
  const pending = data.filter(t => t.status !== '完成')
  const done = data.filter(t => t.status === '完成')

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">待辦清單 （{pending.length} 待辦 / {done.length} 完成）</h3>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
      </div>

      {data.length === 0 ? (
        <p className="text-center py-12 text-gray-400">尚無待辦事項</p>
      ) : (
        <div className="space-y-2">
          {[...pending, ...done].map(t => (
            <div key={t.id} className={`bg-white border rounded-xl p-4 flex items-start gap-3 ${t.status === '完成' ? 'opacity-60' : 'border-gray-200'}`}>
              <button onClick={() => toggleDone(t.id, t.status)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                  ${t.status === '完成' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}>
                {t.status === '完成' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium text-gray-800 ${t.status === '完成' ? 'line-through' : ''}`}>{t.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${priorityBadge[t.priority]}`}>{t.priority}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t.category}</span>
                </div>
                {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                {t.due_date && <p className="text-xs text-gray-400 mt-1">截止：{fmt(t.due_date)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="新增待辦事項" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 font-medium">事項 *</label>
              <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium">說明</label>
              <input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">截止日</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">優先順序</label>
                <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option>高</option><option>中</option><option>低</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">類別</label>
                <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option>工程</option><option>行政</option><option>設備</option><option>其他</option>
                </select>
              </div>
            </div>
          </div>
          <ModalFooter onClose={() => setShowAdd(false)} onSave={add} saving={saving} disabled={!form.title} />
        </Modal>
      )}
    </div>
  )
}

// ── 共用元件 ──────────────────────────────────────
function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ModalFooter({ onClose, onSave, saving, disabled }: { onClose: () => void, onSave: () => void, saving: boolean, disabled: boolean }) {
  return (
    <div className="flex gap-2 mt-5">
      <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">取消</button>
      <button onClick={onSave} disabled={disabled || saving}
        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {saving ? '儲存中...' : '儲存'}
      </button>
    </div>
  )
}
