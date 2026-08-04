'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Investor, MonthlyReport, ShareTransfer, TransferApplicant } from '@/types'

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const fmt    = (n: number) => `NT$ ${Math.round(n).toLocaleString()}`
const fmtK   = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(Math.round(n))
const fmtPct = (n: number) => {
  // 移除尾隨零，但至少顯示3位小數
  const s = n.toFixed(3)
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') + '%'
}

/* ── Investor Group（依 email 或姓名合併多輪次） ───────────── */
interface InvestorGroup {
  key: string          // email (小寫) 或 姓名
  name: string
  email: string | null
  rounds: number[]
  totalPct: number
  totalAmount: number
  ids: string[]        // 所有輪次的 investor id
}

function buildGroups(investors: Investor[]): InvestorGroup[] {
  const map = new Map<string, InvestorGroup>()
  for (const inv of investors) {
    const key = inv.email?.toLowerCase().trim() || inv.name.trim()
    if (!map.has(key)) {
      map.set(key, { key, name: inv.name, email: inv.email ?? null, rounds: [], totalPct: 0, totalAmount: 0, ids: [] })
    }
    const g = map.get(key)!
    g.rounds.push(inv.round ?? 1)
    // 與投資人頁面相同的精度保留方式
    g.totalPct = Math.round((g.totalPct + (inv.percentage ?? 0)) * 1000) / 1000
    g.totalAmount += inv.amount ?? 0
    g.ids.push(inv.id)
  }
  return Array.from(map.values()).sort((a, b) => Math.min(...a.rounds) - Math.min(...b.rounds))
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-teal-600">{fmt(payload[0].value)}</p>
    </div>
  )
}

export default function ShareholderPortal() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'manager'

  const [investors,   setInvestors]   = useState<Investor[]>([])
  const [groups,      setGroups]      = useState<InvestorGroup[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [reports,     setReports]     = useState<MonthlyReport[]>([])
  const [transfers,   setTransfers]   = useState<ShareTransfer[]>([])
  const [totalVal,    setTotalVal]    = useState(0)
  const [storeName,   setStoreName]   = useState('')
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<'dash' | 'history' | 'transfer'>('dash')

  const [showExit,   setShowExit]   = useState(false)
  const [exitForm,   setExitForm]   = useState({ asking_price: '', note: '' })
  const [savingExit, setSavingExit] = useState(false)

  const [showBuy,   setShowBuy]   = useState(false)
  const [buyTarget, setBuyTarget] = useState<ShareTransfer | null>(null)
  const [buyForm,   setBuyForm]   = useState({ name: '', email: '', phone: '', note: '' })
  const [savingBuy, setSavingBuy] = useState(false)

  const [lottery,    setLottery]    = useState<{ id: string; names: string[]; idx: number; done: boolean } | null>(null)
  const lotteryTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showAddInv, setShowAddInv] = useState(false)
  const [winnerPair, setWinnerPair] = useState<{ transfer: ShareTransfer; winner: TransferApplicant } | null>(null)
  const [invRound,   setInvRound]   = useState('5')
  const [addingInv,  setAddingInv]  = useState(false)

  /* ── 找出目前查看的股東群組 ──────────────────────────────── */
  const myGroup: InvestorGroup | null = (() => {
    if (selectedKey) return groups.find(g => g.key === selectedKey) ?? null
    // 依 email 自動比對
    const byEmail = groups.find(g =>
      g.email && user?.email && g.email.toLowerCase() === user.email.toLowerCase()
    )
    if (byEmail) return byEmail
    if (isAdmin && groups.length > 0) return groups[0]
    return null
  })()

  // 合計 % 與金額（已加總所有輪次）
  const myPct   = myGroup?.totalPct ?? 0
  const myAmnt: number | null = myGroup
    ? (myGroup.totalAmount > 0
        ? myGroup.totalAmount
        : totalVal > 0 ? Math.round(myPct / 100 * totalVal) : null)
    : null

  const cumIncome = reports.reduce((s, r) => s + r.net_profit * myPct / 100, 0)
  const remaining = myAmnt != null ? Math.max(0, myAmnt - cumIncome) : null
  const bePct     = myAmnt != null && myAmnt > 0 ? Math.min(100, cumIncome / myAmnt * 100) : null

  const latest = reports[0] ?? null
  const prev   = reports[1] ?? null
  const thisMo = latest ? latest.net_profit * myPct / 100 : 0
  const prevMo = prev   ? prev.net_profit   * myPct / 100 : 0
  const moCh   = prevMo > 0 ? (thisMo - prevMo) / prevMo * 100 : 0

  const chartData = reports.slice(0, 12).reverse().map(r => ({
    label: `${r.month}月`, income: Math.round(r.net_profit * myPct / 100),
  }))

  const tickerItems = [
    ...(storeName ? [{ label: '店面', val: storeName }] : []),
    ...(latest    ? [{ label: `${latest.year}/${latest.month} 淨利`, val: fmt(latest.net_profit) }] : []),
    ...(myGroup   ? [
      { label: '本月分潤',  val: fmt(thisMo), chg: prevMo > 0 ? moCh : undefined },
      { label: '持股比例',  val: fmtPct(myPct) },
      { label: '投資金額',  val: myAmnt != null ? fmt(myAmnt) : '—' },
      ...(bePct != null ? [{ label: '回本進度', val: `${bePct.toFixed(1)}%` }] : []),
      { label: '累計收益',  val: fmt(cumIncome) },
    ] : []),
  ]

  /* ── Data ───────────────────────────────────────────────── */
  async function load() {
    setLoading(true)
    const [{ data: inv }, { data: store }, { data: r }, { data: t }] = await Promise.all([
      supabase.from('investors').select('*').eq('store_id', id).order('round').order('created_at'),
      supabase.from('stores').select('name, total_valuation, sqft, price_per_sqft').eq('id', id).single(),
      supabase.from('monthly_reports').select('*').eq('store_id', id)
        .order('year', { ascending: false }).order('month', { ascending: false }),
      supabase.from('share_transfers').select('*, transfer_applicants(*)').eq('store_id', id)
        .order('created_at', { ascending: false }),
    ])
    const invList = inv || []
    setInvestors(invList)
    setGroups(buildGroups(invList))
    setStoreName(store?.name || '')
    if (store) {
      setTotalVal(
        store.total_valuation ||
        (store.sqft && store.price_per_sqft ? store.sqft * store.price_per_sqft / 0.3 : 0)
      )
    }
    setReports(r || [])
    setTransfers(t || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line
  useEffect(() => {
    setBuyForm(f => ({ ...f, email: user?.email || '', name: profile?.display_name || '' }))
  }, [user, profile]) // eslint-disable-line
  useEffect(() => () => { if (lotteryTimer.current) clearInterval(lotteryTimer.current) }, [])

  /* ── Actions ────────────────────────────────────────────── */
  async function submitExit() {
    if (!myGroup) return
    setSavingExit(true)
    // 使用群組第一個 investor id，退股為全部持股
    await supabase.from('share_transfers').insert({
      store_id: id,
      investor_id: myGroup.ids[0],
      seller_name: myGroup.name,
      percentage: myGroup.totalPct,
      asking_price: Number(exitForm.asking_price) || 0,
      status: 'open',
      note: exitForm.note || null,
    })
    setSavingExit(false); setShowExit(false); setExitForm({ asking_price: '', note: '' }); load()
  }

  async function submitBuy() {
    if (!buyTarget) return
    setSavingBuy(true)
    await supabase.from('transfer_applicants').insert({
      transfer_id: buyTarget.id, name: buyForm.name,
      email: buyForm.email || null, phone: buyForm.phone || null, note: buyForm.note || null,
    })
    setSavingBuy(false); setShowBuy(false); load()
  }

  function runLottery(transfer: ShareTransfer) {
    const apps = transfer.transfer_applicants || []
    if (!apps.length) return
    const names = apps.map(a => a.name)
    let count = 0
    setLottery({ id: transfer.id, names, idx: 0, done: false })
    lotteryTimer.current = setInterval(() => {
      count++
      setLottery(prev => prev ? { ...prev, idx: Math.floor(Math.random() * names.length) } : null)
      if (count >= 22) {
        clearInterval(lotteryTimer.current!)
        const arr = new Uint32Array(1)
        crypto.getRandomValues(arr)
        const winIdx = arr[0] % apps.length
        const winner = apps[winIdx]
        setLottery({ id: transfer.id, names, idx: winIdx, done: true })
        Promise.all([
          supabase.from('transfer_applicants').update({ is_winner: true }).eq('id', winner.id),
          supabase.from('share_transfers').update({ status: 'completed', winner_applicant_id: winner.id }).eq('id', transfer.id),
        ]).then(() => setTimeout(() => { setLottery(null); load() }, 3500))
      }
    }, 130)
  }

  async function cancelTransfer(tid: string) {
    await supabase.from('share_transfers').update({ status: 'cancelled' }).eq('id', tid); load()
  }

  async function addWinnerAsInvestor() {
    if (!winnerPair) return
    setAddingInv(true)
    const { transfer, winner } = winnerPair
    await supabase.from('investors').insert({
      store_id: id, name: winner.name, round: Number(invRound),
      percentage: transfer.percentage, amount: transfer.asking_price,
      phone: winner.phone || null, email: winner.email || null,
      pay_status: 'pending', contract_sent: false, contract_signed: false,
      note: `二手股份，購自 ${transfer.seller_name} 轉讓`,
    })
    setAddingInv(false); setShowAddInv(false); setWinnerPair(null); load()
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      open: 'bg-blue-50 text-blue-600', pending_lottery: 'bg-purple-50 text-purple-600',
      completed: 'bg-emerald-50 text-emerald-600', cancelled: 'bg-gray-100 text-gray-400',
    }
    const label: Record<string, string> = {
      open: '開放申購', pending_lottery: '等待抽籤', completed: '已完成', cancelled: '已取消',
    }
    return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] ?? map['cancelled']}`}>{label[status] ?? '已取消'}</span>
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white'

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">載入中...</p></div>

  const noMatch = !isAdmin && !myGroup

  return (
    <div className="bg-gray-50 min-h-screen">
      <style>{`
        @keyframes portal-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .portal-ticker { animation: portal-ticker 28s linear infinite; }
        .portal-ticker:hover { animation-play-state: paused; }
        @keyframes shimmer-light { 0%{left:-100%} 100%{left:200%} }
        .shimmer-bar::after {
          content:''; position:absolute; top:0; left:-100%; bottom:0; width:60%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent);
          animation:shimmer-light 2s infinite;
        }
        @keyframes lottery-flash { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        .lottery-name { animation:lottery-flash 0.26s ease-in-out infinite; }
        @keyframes count-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .count-up { animation:count-up 0.6s ease-out; }
      `}</style>

      {/* Ticker */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 h-9 flex items-center overflow-hidden shadow-sm">
        <div className="bg-gray-900 text-white h-full px-3 flex items-center gap-1.5 shrink-0" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90 animate-pulse" />
          LIVE
        </div>
        <div className="overflow-hidden flex-1">
          <div className="portal-ticker flex items-center gap-10 whitespace-nowrap px-5 text-xs">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-gray-400">{item.label}</span>
                <span className="font-semibold text-gray-800">{item.val}</span>
                {'chg' in item && item.chg !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.chg >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {item.chg >= 0 ? '▲' : '▼'} {Math.abs(item.chg).toFixed(1)}%
                  </span>
                )}
                <span className="text-gray-200">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">股東入口</h1>
          <p className="text-sm text-gray-400 mt-0.5">{storeName && `${storeName} · `}分潤試算與股份管理</p>
        </div>

        {noMatch ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">🔐</p>
            <p className="font-bold text-gray-800 text-lg mb-1">尚未連結股東資料</p>
            <p className="text-gray-400 text-sm">您的帳號 email 尚未與任何股東資料連結，請聯繫管理員</p>
          </div>
        ) : (
          <>
            {/* Admin group selector */}
            {isAdmin && groups.length > 0 && (
              <div className="mb-5 flex items-center gap-3">
                <label className="text-xs text-gray-400 shrink-0">查看視角：</label>
                <select
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  value={selectedKey ?? (myGroup?.key ?? '')}
                  onChange={e => setSelectedKey(e.target.value)}
                >
                  {groups.map(g => (
                    <option key={g.key} value={g.key}>
                      {g.name}　{fmtPct(g.totalPct)}{g.rounds.length > 1 ? `（${g.rounds.length}輪）` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
              {[
                { key: 'dash',     label: '儀表板' },
                { key: 'history',  label: '歷史收益' },
                { key: 'transfer', label: `股份異動${transfers.filter(t => t.status === 'open').length > 0 ? ` · ${transfers.filter(t => t.status === 'open').length}` : ''}` },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as 'dash' | 'history' | 'transfer')}
                  className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                    tab === t.key ? 'text-accent border-orange-500' : 'text-gray-400 border-transparent hover:text-gray-700'
                  }`}>{t.label}</button>
              ))}
            </div>

            {/* ── Dashboard ──────────────────────────────── */}
            {tab === 'dash' && (
              <div className="space-y-4">

                {/* Hero card */}
                <div className="relative rounded-2xl overflow-hidden p-6 sm:p-8 text-white"
                  style={{ background: 'linear-gradient(135deg, #185FA5 0%, #1D9E75 100%)' }}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
                  <p className="text-sm text-white/70 mb-2">
                    {myGroup?.name && <span className="font-semibold text-white/90">{myGroup.name} · </span>}
                    {latest ? `${latest.year}年 ${latest.month}月 · 本月分潤` : '本月分潤'}
                  </p>
                  <div className="flex items-end gap-3 flex-wrap">
                    <p className="count-up font-extrabold leading-none" style={{ fontSize: 'clamp(32px, 8vw, 52px)', letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(thisMo)}
                    </p>
                    {prevMo > 0 && (
                      <span className={`mb-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${moCh >= 0 ? 'bg-white/20 text-white' : 'bg-red-400/30 text-white'}`}>
                        {moCh >= 0 ? '▲' : '▼'} {Math.abs(moCh).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 mt-3">
                    {latest
                      ? `店面淨利 ${fmt(latest.net_profit)} · 持股 ${fmtPct(myPct)}`
                      : '等待管理員上傳月財報'}
                  </p>
                  {/* 輪次明細（有多輪時顯示） */}
                  {myGroup && myGroup.rounds.length > 1 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {myGroup.ids.map((invId, idx) => {
                        const inv = investors.find(i => i.id === invId)
                        if (!inv) return null
                        return (
                          <span key={invId} className="text-[11px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                            第{myGroup.rounds[idx]}輪 {fmtPct(inv.percentage ?? 0)}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
                  <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/5" />
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: '📊', label: '持股比例',   val: myPct > 0 ? fmtPct(myPct) : '—',                color: 'text-blue-600',    bg: 'bg-blue-50' },
                    { icon: '💰', label: '投資金額',   val: myAmnt != null && myAmnt > 0 ? fmt(myAmnt) : '未設定', color: 'text-amber-600', bg: 'bg-amber-50' },
                    { icon: '📈', label: '累計收益',   val: fmt(cumIncome),                                  color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { icon: '🎯', label: '剩餘未回本', val: remaining != null ? (remaining > 0 ? fmt(remaining) : '🎉 已回本') : '—',
                      color: remaining != null && remaining <= 0 ? 'text-emerald-600' : 'text-gray-700', bg: 'bg-gray-50' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center text-lg mb-3`}>{s.icon}</div>
                      <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                      <p className={`text-base font-bold leading-tight ${s.color}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Break-even */}
                {bePct != null && myAmnt != null && myAmnt > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-gray-700">回本進度</span>
                      <span className={`text-xl font-black ${bePct >= 100 ? 'text-emerald-600' : 'text-accent'}`}>{bePct.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                      <div className="shimmer-bar h-full rounded-full relative overflow-hidden transition-all duration-1000"
                        style={{ width: `${bePct}%`, background: bePct >= 100 ? 'linear-gradient(90deg,#059669,#10b981)' : 'linear-gradient(90deg,#f59e0b,#f97316)' }} />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-400">投資 {fmt(myAmnt)}</span>
                      <span className="text-xs text-gray-400">
                        {remaining != null && remaining > 0 ? `還差 ${fmt(remaining)}` : `多賺 ${fmt(cumIncome - myAmnt)}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Chart */}
                {chartData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">月分潤走勢（近 {chartData.length} 個月）</p>
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={fmtK} width={44} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                          <Bar dataKey="income" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── History Tab ────────────────────────────── */}
            {tab === 'history' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {reports.length === 0 ? (
                  <div className="p-12 text-center"><p className="text-3xl mb-2">📋</p><p className="text-gray-400 text-sm">尚無收益記錄</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: 540 }}>
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['月份', '店面淨利', '我的分潤', '環比', '累計收益'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r, idx) => {
                          const income  = r.net_profit * myPct / 100
                          const pIncome = reports[idx + 1] ? reports[idx + 1].net_profit * myPct / 100 : 0
                          const chg     = pIncome > 0 ? (income - pIncome) / pIncome * 100 : 0
                          const cumul   = reports.slice(idx).reduce((s, rr) => s + rr.net_profit * myPct / 100, 0)
                          return (
                            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{r.year}年 {MONTHS[r.month - 1]}</td>
                              <td className="px-4 py-3 text-gray-600">{fmt(r.net_profit)}</td>
                              <td className="px-4 py-3 font-bold text-emerald-600">{fmt(income)}</td>
                              <td className="px-4 py-3">
                                {pIncome > 0
                                  ? <span className={`text-xs font-semibold ${chg >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(1)}%</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{fmt(cumul)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-100 bg-gray-50/50">
                          <td colSpan={2} className="px-4 py-3 text-xs text-gray-400">合計 {reports.length} 期</td>
                          <td className="px-4 py-3 font-black text-emerald-600">{fmt(cumIncome)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Transfer Tab ───────────────────────────── */}
            {tab === 'transfer' && (
              <div className="space-y-4">

                {/* My exit */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                    <p className="font-bold text-gray-900">我的退股申請</p>
                    {myGroup && !transfers.some(t => myGroup.ids.includes(t.investor_id) && t.status === 'open') && (
                      <button onClick={() => setShowExit(true)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors">
                        申請退股
                      </button>
                    )}
                  </div>
                  {transfers.filter(t => myGroup && myGroup.ids.includes(t.investor_id)).length === 0
                    ? <p className="text-gray-400 text-sm">目前無退股申請</p>
                    : transfers.filter(t => myGroup && myGroup.ids.includes(t.investor_id)).map(t => (
                      <div key={t.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            {statusBadge(t.status)}
                            <p className="font-semibold text-gray-800 mt-2">{fmtPct(t.percentage ?? 0)} 持股</p>
                            <p className="text-amber-600 font-bold">{fmt(t.asking_price)}</p>
                            {t.note && <p className="text-gray-400 text-xs mt-1">{t.note}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-xs">申請人 {(t.transfer_applicants || []).length} 位</p>
                            {t.status === 'open' && (
                              <button onClick={() => cancelTransfer(t.id)} className="text-red-400 text-xs mt-2 hover:underline block">撤回申請</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Available to buy */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="font-bold text-gray-900 mb-4">可購買的釋出股份</p>
                  {transfers.filter(t => t.status === 'open' && (!myGroup || !myGroup.ids.includes(t.investor_id))).length === 0
                    ? <p className="text-gray-400 text-sm">目前無可購買的股份</p>
                    : (
                      <div className="space-y-3">
                        {transfers.filter(t => t.status === 'open' && (!myGroup || !myGroup.ids.includes(t.investor_id))).map(t => (
                          <div key={t.id} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex justify-between flex-wrap gap-3">
                              <div>
                                <p className="text-xs text-gray-400">賣方股東</p>
                                <p className="font-semibold text-gray-800">{t.seller_name}</p>
                                <p className="text-gray-500 text-sm">{fmtPct(t.percentage ?? 0)} 持股</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400">轉讓價格</p>
                                <p className="text-xl font-black text-amber-600">{fmt(t.asking_price)}</p>
                              </div>
                            </div>
                            {t.note && <p className="text-gray-400 text-xs mt-2">{t.note}</p>}
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                              <p className="text-gray-400 text-xs">已有 {(t.transfer_applicants || []).length} 人申請</p>
                              <button onClick={() => { setBuyTarget(t); setShowBuy(true) }}
                                className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors">
                                申請購買
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Admin management */}
                {isAdmin && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-violet-50 text-violet-600 text-[11px] font-bold px-2 py-0.5 rounded-full">管理員</span>
                      <p className="font-bold text-gray-900">退股申請管理</p>
                    </div>
                    {transfers.length === 0
                      ? <p className="text-gray-400 text-sm">目前無退股申請記錄</p>
                      : (
                        <div className="space-y-4">
                          {transfers.map(t => {
                            const apps   = t.transfer_applicants || []
                            const winner = apps.find(a => a.is_winner)
                            const isLot  = lottery?.id === t.id
                            return (
                              <div key={t.id} className="bg-gray-50 rounded-xl p-4">
                                <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {statusBadge(t.status)}
                                    <span className="font-semibold text-gray-800">{t.seller_name}</span>
                                    <span className="text-gray-400 text-sm">· {fmtPct(t.percentage ?? 0)} · {fmt(t.asking_price)}</span>
                                  </div>
                                  {t.status === 'open' && apps.length > 0 && (
                                    <button onClick={() => runLottery(t)} disabled={!!lottery}
                                      className="px-3 py-1.5 text-white text-xs font-bold rounded-xl disabled:opacity-40 transition-all"
                                      style={{ background: 'linear-gradient(135deg,#9b59b6,#4a90e2)' }}>
                                      🎲 開始抽籤
                                    </button>
                                  )}
                                </div>
                                {isLot && lottery && (
                                  <div className="bg-white border-2 border-violet-200 rounded-xl p-4 text-center mb-3">
                                    <p className="text-xs text-gray-400 mb-2">{lottery.done ? '🎉 抽籤結果' : '抽籤中...'}</p>
                                    <p className={`text-2xl font-black text-amber-600 ${lottery.done ? '' : 'lottery-name'}`}>{lottery.names[lottery.idx]}</p>
                                  </div>
                                )}
                                {winner && (
                                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3">
                                    <p className="font-bold text-emerald-700 text-sm">🏆 中籤：{winner.name}</p>
                                    {winner.email && <p className="text-emerald-600 text-xs mt-0.5">{winner.email}</p>}
                                    {winner.phone && <p className="text-emerald-600 text-xs">{winner.phone}</p>}
                                    <button onClick={() => { setWinnerPair({ transfer: t, winner }); setShowAddInv(true) }}
                                      className="mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors">
                                      + 加入股東收款名單
                                    </button>
                                  </div>
                                )}
                                {apps.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-400 mb-2">申請人（{apps.length} 位）</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {apps.map(a => (
                                        <div key={a.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2 flex items-center gap-2">
                                          {a.is_winner && <span className="text-sm">🏆</span>}
                                          <div>
                                            <p className={`text-sm font-semibold ${a.is_winner ? 'text-emerald-700' : 'text-gray-800'}`}>{a.name}</p>
                                            {a.phone && <p className="text-gray-400 text-xs">{a.phone}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Exit Modal */}
      {showExit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-gray-900 mb-1">申請退股</h3>
            <p className="text-sm text-gray-400 mb-4">退出全部持股 {fmtPct(myPct)}，設定轉讓價格</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">轉讓要求金額（NT$）*</label>
                <input type="number" className={inputCls} placeholder="例：200000" value={exitForm.asking_price} onChange={e => setExitForm(f => ({ ...f, asking_price: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">備註說明（可留空）</label>
                <input type="text" className={inputCls} placeholder="其他說明..." value={exitForm.note} onChange={e => setExitForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExit(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={submitExit} disabled={savingExit || !exitForm.asking_price}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {savingExit ? '送出中...' : '確認申請退股'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Modal */}
      {showBuy && buyTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-gray-900 mb-1">申請購買股份</h3>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500">賣方：{buyTarget.seller_name} · {fmtPct(buyTarget.percentage ?? 0)}</p>
              <p className="text-amber-600 font-bold">轉讓價：{fmt(buyTarget.asking_price)}</p>
            </div>
            <div className="space-y-3 mb-4">
              {([
                { label: '您的姓名 *', key: 'name',  type: 'text',  ph: '真實姓名' },
                { label: '聯絡 Email', key: 'email', type: 'email', ph: 'example@email.com' },
                { label: '聯絡電話',   key: 'phone', type: 'tel',   ph: '0912-345-678' },
                { label: '備註',       key: 'note',  type: 'text',  ph: '其他說明...' },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                  <input type={f.type} className={inputCls} placeholder={f.ph} value={buyForm[f.key]} onChange={e => setBuyForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBuy(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={submitBuy} disabled={savingBuy || !buyForm.name}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {savingBuy ? '送出中...' : '確認申請'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Investor Modal */}
      {showAddInv && winnerPair && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-xl max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-1">加入股東收款名單</h3>
            <p className="text-sm text-gray-400 mb-4">將中籤者作為二手股東加入（與原始輪次分開）</p>
            <div className="bg-emerald-50 rounded-xl p-3 mb-4 text-sm">
              <p className="text-gray-600">姓名：<span className="font-semibold text-gray-900">{winnerPair.winner.name}</span></p>
              <p className="text-gray-600">持股：<span className="font-semibold text-emerald-700">{fmtPct(winnerPair.transfer.percentage ?? 0)}</span></p>
              <p className="text-gray-600">購入價：<span className="font-semibold text-amber-600">{fmt(winnerPair.transfer.asking_price)}</span></p>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">加入輪次</label>
              <select className={inputCls} value={invRound} onChange={e => setInvRound(e.target.value)}>
                <option value="4">第四輪（外部投資人）</option>
                <option value="5">第五輪（二手股東）</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowAddInv(false); setWinnerPair(null) }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={addWinnerAsInvestor} disabled={addingInv}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {addingInv ? '加入中...' : '確認加入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
