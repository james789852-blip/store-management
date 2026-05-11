'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Investor, InvestorPayStatus } from '@/types'
import { INVESTOR_PAY_STATUS_LABEL } from '@/types'
import { INVESTOR_PAY_BADGE } from '@/lib/colors'

const MAX_PCT = 30 // 固定對外募資上限 30%

// ── 色票 ──────────────────────────────────────────────────────
const ROUND_META = [
  { round: 1, label: '第一輪', sub: '管理人員', color: 'bg-indigo-500', tint: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { round: 2, label: '第二輪', sub: '管理人員追加', color: 'bg-violet-500', tint: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { round: 3, label: '第三輪', sub: '管理人員追加', color: 'bg-blue-500', tint: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { round: 4, label: '第四輪', sub: '外部投資人', color: 'bg-teal-500', tint: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
]

const INVESTOR_COLORS = [
  '#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6',
]

// ── Types ─────────────────────────────────────────────────────
interface RoundConfig { management: number; r2: number; r3: number; r4: number }

type TabType = 'investors' | 'contract'

type InvestorForm = {
  name: string; round: string; percentage: string; phone: string
  email: string; id_number: string; address: string
  pay_status: InvestorPayStatus; contract_sent: boolean
  contract_signed: boolean; sign_date: string; pay_deadline: string; note: string
}

type ContractGroup = {
  key: string
  name: string
  email: string | null
  rounds: number[]
  totalPct: number
  totalAmount: number
  contractUrl: string | null
  ids: string[]
  contractSent: boolean
  contractSigned: boolean
  payStatus: InvestorPayStatus
  payDeadline: string | null
  signDate: string | null
}

function emptyForm(): InvestorForm {
  return { name: '', round: '1', percentage: '', phone: '', email: '',
    id_number: '', address: '', pay_status: 'pending',
    contract_sent: false, contract_signed: false, sign_date: '', pay_deadline: '', note: '' }
}

function fmt(n: number) { return `NT$ ${Math.round(n).toLocaleString()}` }
function floor2(n: number) { return Math.floor(n * 1000) / 1000 }

// ── Main Component ────────────────────────────────────────────
export default function InvestorsPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [tab, setTab] = useState<TabType>('investors')
  const [investors, setInvestors] = useState<Investor[]>([])
  const [storeData, setStoreData] = useState<{ sqft: number | null; price_per_sqft: number | null; total_valuation: number | null } | null>(null)
  const [rcId, setRcId] = useState<string | null>(null)
  const [roundConfig, setRoundConfig] = useState<RoundConfig>({ management: 0, r2: 0, r3: 0, r4: 0 })
  const [rcDraft, setRcDraft] = useState<RoundConfig>({ management: 0, r2: 0, r3: 0, r4: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingRc, setSavingRc] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<InvestorForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const isComposing = useRef(false)

  // ── Contract email state ──────────────────────────────────
  const [fromEmail, setFromEmail] = useState('kaize1213@liang-ping.com')
  const [batchDeadline, setBatchDeadline] = useState('')
  const [batchSignDate, setBatchSignDate] = useState('')
  const [applyingBatch, setApplyingBatch] = useState(false)
  const [batchApplied, setBatchApplied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendResults, setSendResults] = useState<{ id: string; name: string; success: boolean; reason?: string }[]>([])
  const [storeName, setStoreName] = useState('')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadingGroupIds, setUploadingGroupIds] = useState<string[] | null>(null)
  const contractFileRef = useRef<HTMLInputElement>(null)
  const [singleSendResult, setSingleSendResult] = useState<{ name: string; success: boolean; reason?: string } | null>(null)
  const [r1SourceId, setR1SourceId] = useState<string>('')

  useEffect(() => {
    supabase.from('stores').select('name').eq('id', id).single().then(({ data }) => {
      if (data) setStoreName(data.name)
    })
  }, [id]) // eslint-disable-line

  const triggerContractUpload = useCallback((invId: string) => {
    setUploadingId(invId)
    setUploadingGroupIds(null)
    contractFileRef.current?.click()
  }, [])

  const triggerGroupUpload = useCallback((group: ContractGroup) => {
    setUploadingGroupIds(group.ids)
    setUploadingId(null)
    contractFileRef.current?.click()
  }, [])

  async function handleContractFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const targetIds = uploadingGroupIds ?? (uploadingId ? [uploadingId] : [])
    if (targetIds.length === 0) return
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const path = `contracts/${id}/${targetIds[0]}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('store-files').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('store-files').getPublicUrl(path)
      for (const invId of targetIds) {
        await supabase.from('investors').update({ contract_url: publicUrl }).eq('id', invId)
      }
      setInvestors(prev => prev.map(i => targetIds.includes(i.id) ? { ...i, contract_url: publicUrl } : i))
    }
    setUploadingId(null)
    setUploadingGroupIds(null)
    e.target.value = ''
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function load() {
    setLoading(true)
    const [{ data: inv }, { data: store }, { data: rcItems }] = await Promise.all([
      supabase.from('investors').select('*').eq('store_id', id).order('round').order('created_at', { ascending: true }),
      supabase.from('stores').select('sqft, price_per_sqft, total_valuation').eq('id', id).single(),
      supabase.from('budget_items').select('id, notes').eq('store_id', id).eq('category', '__round_config__').maybeSingle(),
    ])
    setInvestors(inv || [])
    setStoreData(store)
    if (rcItems) {
      setRcId(rcItems.id)
      try {
        const parsed = JSON.parse(rcItems.notes ?? '{}')
        setRoundConfig(parsed)
        setRcDraft(parsed)
      } catch { /* ignore parse error */ }
    }
    setLoading(false)
  }

  // ── Derived calculations ──────────────────────────────────
  const sqft = storeData?.sqft ?? 0
  const pricePerSqft = storeData?.price_per_sqft ?? 0
  const totalBudget = sqft * pricePerSqft
  const totalValuation = totalBudget > 0 ? totalBudget / 0.3 : (storeData?.total_valuation ?? 0)
  const onePercent = totalValuation * 0.01

  // Per-round usage
  const byRound = (r: number) => investors.filter(i => i.round === r)
  const usedPct = (r: number) => byRound(r).reduce((s, i) => s + (i.percentage || 0), 0)

  const r1Used = usedPct(1)
  const r2Used = usedPct(2)
  const r3Used = usedPct(3)
  const r4Used = usedPct(4)

  const afterR1 = floor2(MAX_PCT - r1Used)
  const afterR2 = floor2(afterR1 - r2Used)
  const afterR3 = floor2(afterR2 - r3Used)
  const afterR4 = floor2(afterR3 - r4Used)

  // Per-person limits
  const r1Limit = roundConfig.management > 0 ? floor2(MAX_PCT / roundConfig.management) : 0
  const r2Limit = roundConfig.r2 > 0 && afterR1 > 0 ? floor2(afterR1 / roundConfig.r2) : 0
  const r3Limit = roundConfig.r3 > 0 && afterR2 > 0 ? floor2(afterR2 / roundConfig.r3) : 0
  const r4Limit = roundConfig.r4 > 0 && afterR3 > 0 ? floor2(afterR3 / roundConfig.r4) : 0

  // Round status
  const r1Open = roundConfig.management > 0
  const r2Open = r1Open && afterR1 > 0 && roundConfig.r2 > 0 && r2Limit >= 0.01
  const r3Open = r2Open && afterR2 > 0 && roundConfig.r3 > 0 && r3Limit >= 0.01
  const r4Open = r3Open && afterR3 >= 0.01 && roundConfig.r4 > 0 && r4Limit >= 0.01

  const roundStatus = [r1Open, r2Open, r3Open, r4Open]
  const roundLimits = [r1Limit, r2Limit, r3Limit, r4Limit]
  const roundAfter = [afterR1, afterR2, afterR3, afterR4]
  const roundUsed = [r1Used, r2Used, r3Used, r4Used]

  const totalPct = r1Used + r2Used + r3Used + r4Used
  const totalAmount = investors.reduce((s, i) => s + (i.amount || 0), 0)
  const paidAmount = investors.filter(i => i.pay_status === 'paid').reduce((s, i) => s + (i.amount || 0), 0)
  const uniqueInvestorCount = (() => {
    const keys = new Set<string>()
    investors.filter(i => (i.round ?? 1) <= 3).forEach(i => keys.add(i.email?.toLowerCase().trim() || i.name.trim()))
    return keys.size + investors.filter(i => (i.round ?? 1) === 4).length
  })()
  const uniquePaidCount = (() => {
    const keys = new Set<string>()
    investors.filter(i => (i.round ?? 1) <= 3 && i.pay_status === 'paid').forEach(i => keys.add(i.email?.toLowerCase().trim() || i.name.trim()))
    return keys.size + investors.filter(i => (i.round ?? 1) === 4 && i.pay_status === 'paid').length
  })()

  // ── Contract groups (rounds 1-3 merged per person, round 4 separate) ──
  function getContractGroups(): { groups: ContractGroup[]; round4: Investor[] } {
    const map = new Map<string, ContractGroup>()
    for (const inv of investors.filter(i => (i.round ?? 1) <= 3)) {
      const key = inv.email?.toLowerCase().trim() || inv.name.trim()
      if (!map.has(key)) {
        map.set(key, { key, name: inv.name, email: inv.email ?? null,
          rounds: [], totalPct: 0, totalAmount: 0,
          contractUrl: null, ids: [], contractSent: false, contractSigned: false, payStatus: 'paid',
          payDeadline: null, signDate: null })
      }
      const g = map.get(key)!
      g.rounds.push(inv.round ?? 1)
      g.totalPct = Math.round((g.totalPct + (inv.percentage ?? 0)) * 1000) / 1000
      g.totalAmount += inv.amount ?? 0
      g.ids.push(inv.id)
      if (inv.contract_url && !g.contractUrl) g.contractUrl = inv.contract_url
      if (inv.contract_sent) g.contractSent = true
      if (inv.contract_signed) g.contractSigned = true
      if (inv.pay_status !== 'paid') {
        if (inv.pay_status === 'overdue') g.payStatus = 'overdue'
        else if (g.payStatus !== 'overdue') g.payStatus = 'pending'
      }
      if (inv.pay_deadline && !g.payDeadline) g.payDeadline = inv.pay_deadline
      if (inv.sign_date && !g.signDate) g.signDate = inv.sign_date
    }
    return { groups: Array.from(map.values()), round4: investors.filter(i => (i.round ?? 1) === 4) }
  }

  async function sendGroup(group: ContractGroup) {
    if (!group.email || !group.contractUrl) return
    setSendingId(group.key)
    setSingleSendResult(null)
    const roundLabel = group.rounds.sort((a,b)=>a-b).join('、')
    const res = await fetch('/api/investors/send-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investors: [{ id: group.ids[0], name: group.name, email: group.email,
          percentage: group.totalPct, amount: group.totalAmount,
          pay_deadline: group.payDeadline ?? null, round: roundLabel, contractUrl: group.contractUrl }],
        contractUrl: group.contractUrl, storeName,
      }),
    })
    const json = await res.json()
    const r = json.results?.[0]
    if (r?.success) {
      for (const invId of group.ids) {
        await supabase.from('investors').update({ contract_sent: true }).eq('id', invId)
      }
      setInvestors(prev => prev.map(i => group.ids.includes(i.id) ? { ...i, contract_sent: true } : i))
      setSingleSendResult({ name: group.name, success: true })
    } else {
      setSingleSendResult({ name: group.name, success: false, reason: r?.reason ?? '寄送失敗' })
    }
    setSendingId(null)
    setTimeout(() => setSingleSendResult(null), 6000)
  }

  async function applyBatchDates() {
    if (!batchDeadline && !batchSignDate) return
    setApplyingBatch(true)
    const patch: Partial<Investor> = {}
    if (batchDeadline) patch.pay_deadline = batchDeadline
    if (batchSignDate) patch.sign_date = batchSignDate
    const allIds = investors.map(i => i.id)
    for (const invId of allIds) {
      await supabase.from('investors').update(patch).eq('id', invId)
    }
    setInvestors(prev => prev.map(i => ({ ...i, ...patch })))
    setApplyingBatch(false)
    setBatchApplied(true)
    setTimeout(() => setBatchApplied(false), 3000)
  }

  async function quickUpdateGroup(ids: string[], patch: Partial<Investor>) {
    for (const invId of ids) {
      await supabase.from('investors').update(patch).eq('id', invId)
    }
    setInvestors(prev => prev.map(i => ids.includes(i.id) ? { ...i, ...patch } : i))
  }

  // ── Save round config ─────────────────────────────────────
  async function saveRoundConfig() {
    setSavingRc(true)
    const notes = JSON.stringify(rcDraft)
    if (rcId) {
      await supabase.from('budget_items').update({ notes }).eq('id', rcId)
    } else {
      const { data } = await supabase.from('budget_items').insert({
        store_id: id, category: '__round_config__', name: 'round_settings',
        estimated_amount: 0, notes, order_index: -1,
      }).select('id').single()
      if (data) setRcId(data.id)
    }
    setRoundConfig(rcDraft)
    setSavingRc(false)
    setShowSettings(false)
  }

  // ── Investor CRUD ─────────────────────────────────────────
  function openAdd(defaultRound?: number) {
    setEditId(null)
    setForm({ ...emptyForm(), round: String(defaultRound ?? 1) })
    setR1SourceId('')
    setShowModal(true)
  }
  function openEdit(inv: Investor) {
    setEditId(inv.id)
    setForm({
      name: inv.name, round: String(inv.round ?? 1),
      percentage: inv.percentage?.toString() ?? '',
      phone: inv.phone ?? '', email: inv.email ?? '', id_number: inv.id_number ?? '',
      address: inv.address ?? '', pay_status: inv.pay_status,
      contract_sent: inv.contract_sent, contract_signed: inv.contract_signed,
      sign_date: inv.sign_date ?? '', pay_deadline: inv.pay_deadline ?? '', note: inv.note ?? '',
    })
    setR1SourceId('')
    setShowModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const pct = form.percentage ? parseFloat(form.percentage) : null
    const amount = pct && totalValuation ? Math.round(pct / 100 * totalValuation) : null
    const payload = {
      store_id: id, name: form.name.trim(), round: parseInt(form.round) || 1,
      percentage: pct, amount,
      phone: form.phone || null, email: form.email || null,
      id_number: form.id_number || null, address: form.address || null,
      pay_status: form.pay_status, contract_sent: form.contract_sent,
      contract_signed: form.contract_signed, sign_date: form.sign_date || null,
      pay_deadline: form.pay_deadline || null, note: form.note || null,
    }
    if (editId) await supabase.from('investors').update(payload).eq('id', editId)
    else await supabase.from('investors').insert(payload)
    setSaving(false); setShowModal(false); load()
  }

  async function quickUpdate(invId: string, patch: Partial<Investor>) {
    await supabase.from('investors').update(patch).eq('id', invId)
    setInvestors(prev => prev.map(i => i.id === invId ? { ...i, ...patch } : i))
  }

  async function del(invId: string) {
    await supabase.from('investors').delete().eq('id', invId)
    setDeleteConfirm(null); load()
  }

  function exportExcel() {
    const rows = [['姓名','輪次','持股%','投資金額','電話','Email','付款狀態','合約寄出','合約簽回','繳款期限','備註']]
    investors.forEach(i => rows.push([
      i.name, String(i.round ?? ''), String(i.percentage ?? ''),
      String(i.amount ?? ''), i.phone ?? '', i.email ?? '',
      INVESTOR_PAY_STATUS_LABEL[i.pay_status], i.contract_sent ? '是' : '否',
      i.contract_signed ? '是' : '否', i.pay_deadline ?? '', i.note ?? '',
    ]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = '股東名單.csv'; a.click()
  }

  async function sendSingle(inv: Investor) {
    if (!inv.email || !inv.contract_url) return
    setSendingId(inv.id)
    setSingleSendResult(null)
    const res = await fetch('/api/investors/send-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investors: [{ id: inv.id, name: inv.name, email: inv.email, percentage: inv.percentage, amount: inv.amount, pay_deadline: inv.pay_deadline, round: inv.round }],
        contractUrl: inv.contract_url,
        storeName, fromEmail,
      }),
    })
    const json = await res.json()
    const r = json.results?.[0]
    if (r?.success) {
      await quickUpdate(inv.id, { contract_sent: true })
      setSingleSendResult({ name: inv.name, success: true })
    } else {
      setSingleSendResult({ name: inv.name, success: false, reason: r?.reason ?? '寄送失敗' })
    }
    setSendingId(null)
    setTimeout(() => setSingleSendResult(null), 6000)
  }

  async function sendContracts(onlyUnsent: boolean) {
    setSending(true)
    setSendResults([])
    const targets = investors.filter(i => i.email && i.contract_url && (onlyUnsent ? !i.contract_sent : true))
    if (!targets.length) { setSending(false); return }
    const res = await fetch('/api/investors/send-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investors: targets.map(i => ({
          id: i.id, name: i.name, email: i.email,
          percentage: i.percentage, amount: i.amount,
          pay_deadline: i.pay_deadline, round: i.round,
          contractUrl: i.contract_url,
        })),
        contractUrl: '', storeName, fromEmail,
      }),
    })
    const json = await res.json()
    if (json.results) {
      setSendResults(json.results)
      const sentIds = (json.results as { id: string; success: boolean }[]).filter(r => r.success).map(r => r.id)
      for (const invId of sentIds) {
        await supabase.from('investors').update({ contract_sent: true }).eq('id', invId)
      }
      load()
    }
    setSending(false)
  }

  const previewAmount = form.percentage && totalValuation
    ? Math.round((parseFloat(form.percentage) || 0) / 100 * totalValuation)
    : null

  const configuredRound = parseInt(form.round)
  const maxForThisRound = [r1Limit, r2Limit, r3Limit, r4Limit][configuredRound - 1] ?? 0

  return (
    <div className="bg-gray-50 min-h-full p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">股東收款</h1>
          <div className="flex gap-2">
            <button onClick={() => { setRcDraft(roundConfig); setShowSettings(true) }}
              className="border border-gray-200 bg-white text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              ⚙️ 輪次設定
            </button>
            <button onClick={exportExcel}
              className="border border-gray-200 bg-white text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              ↓ Excel
            </button>
            <button onClick={() => openAdd()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              + 新增股東
            </button>
          </div>
        </div>

        {/* ── Budget info ── */}
        {totalBudget > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
            {[
              { label: '總預算', value: fmt(totalBudget), sub: `${sqft} 坪 × ${pricePerSqft.toLocaleString()}/坪`, color: 'text-gray-900' },
              { label: '店面總估值', value: fmt(totalValuation), sub: '= 總預算 ÷ 30%', color: 'text-indigo-700' },
              { label: '1% 股份價值', value: fmt(onePercent), sub: '= 總估值 × 1%', color: 'text-violet-700' },
              { label: '募資上限', value: `${MAX_PCT}%`, sub: fmt(totalValuation * MAX_PCT / 100), color: 'text-blue-700' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4">
                <p className="text-xs text-gray-400 mb-1 truncate">{c.label}</p>
                <p className={`text-sm sm:text-base font-bold ${c.color} truncate`}>{c.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{c.sub}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5 text-sm text-amber-700">
            尚未在「基本資料」設定坪數與每坪單價，金額無法計算。
          </div>
        )}

        {/* ── Overall progress bar ── */}
        {investors.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="font-medium">整體募資進度</span>
              <span className={`font-bold text-sm ${totalPct > MAX_PCT ? 'text-red-500' : 'text-indigo-600'}`}>
                {totalPct.toFixed(3)}% / {MAX_PCT}%
              </span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-0.5">
              {([1,2,3,4] as const).map(r => {
                const used = roundUsed[r - 1]
                const meta = ROUND_META[r - 1]
                if (used <= 0) return null
                return (
                  <div key={r} className={`h-full ${meta.color} transition-all`}
                    style={{ width: `${(used / MAX_PCT) * 100}%` }}
                    title={`${meta.label}: ${used.toFixed(3)}%`} />
                )
              })}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {ROUND_META.map((m, i) => roundUsed[i] > 0 && (
                <span key={m.round} className="text-xs text-gray-500 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${m.color} inline-block`} />
                  {m.label} {roundUsed[i].toFixed(3)}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          {[
            { label: '股份合計', value: `${totalPct.toFixed(3)}%`, sub: `已確認 ${uniquePaidCount} 位`, color: totalPct > MAX_PCT ? 'text-red-500' : 'text-indigo-600' },
            { label: '總籌資金額', value: fmt(totalAmount), sub: `${uniqueInvestorCount} 位股東`, color: 'text-gray-900' },
            { label: '已到位', value: fmt(paidAmount), sub: `${totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(0) : 0}%`, color: 'text-teal-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 overflow-hidden">
              <p className="text-xs text-gray-400 mb-1 truncate">{c.label}</p>
              <p className={`text-sm sm:text-base font-bold ${c.color} truncate`}>{c.value}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit mb-5">
          {([['investors', '投資人列表'], ['contract', '合約管理']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Investors ── */}
        {tab === 'investors' && (
          loading ? <div className="py-20 text-center text-gray-400">載入中...</div>
          : (
            <div className="space-y-4">
              {ROUND_META.map((meta, idx) => {
                const round = meta.round as 1|2|3|4
                const isOpen = roundStatus[idx]
                const limit = roundLimits[idx]
                const remaining = roundAfter[idx]
                const used = roundUsed[idx]
                const roundInvs = byRound(round)

                // Prerequisite check for rounds 2-4
                let prereqMsg = ''
                if (!isOpen && round > 1) {
                  if (roundConfig[round === 2 ? 'r2' : round === 3 ? 'r3' : 'r4'] === 0) {
                    prereqMsg = `尚未設定第${round}輪人數`
                  } else if (limit < 0.01) {
                    prereqMsg = `每人分配不足 0.01%，不開放第${round}輪`
                  } else {
                    prereqMsg = `前一輪尚未開始或無剩餘股份`
                  }
                }

                return (
                  <div key={round} className={`bg-white rounded-2xl border overflow-hidden ${isOpen ? 'border-gray-200' : 'border-gray-100'}`}>
                    {/* Round header */}
                    <div className={`px-5 py-4 flex items-center justify-between border-b ${isOpen ? 'border-gray-100' : 'border-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${isOpen ? meta.color : 'bg-gray-200'} flex items-center justify-center text-white text-sm font-bold`}>
                          {round}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${isOpen ? 'text-gray-900' : 'text-gray-400'}`}>{meta.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isOpen ? `${meta.tint} ${meta.text}` : 'bg-gray-100 text-gray-400'}`}>
                              {meta.sub}
                            </span>
                            {!isOpen && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">停止</span>
                            )}
                          </div>
                          {isOpen && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                              <span>每人上限 <strong className={meta.text}>{limit.toFixed(3)}%</strong></span>
                              {totalValuation > 0 && <span>≈ {fmt(limit / 100 * totalValuation)}</span>}
                              <span>已用 {used.toFixed(3)}%</span>
                              <span className={remaining < 0 ? 'text-red-500 font-semibold' : ''}>剩餘 {remaining.toFixed(3)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isOpen && (
                        <button onClick={() => openAdd(round)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${meta.tint} ${meta.text} hover:opacity-80`}>
                          + 加入
                        </button>
                      )}
                    </div>

                    {/* Not open message */}
                    {!isOpen && prereqMsg && (
                      <div className="px-5 py-3 text-xs text-gray-400 bg-gray-50">
                        {prereqMsg}
                        {roundConfig.management === 0 || (round > 1 && roundConfig[round === 2 ? 'r2' : round === 3 ? 'r3' : 'r4'] === 0)
                          ? <button onClick={() => { setRcDraft(roundConfig); setShowSettings(true) }}
                              className="ml-2 text-indigo-500 underline">前往設定</button>
                          : null}
                      </div>
                    )}

                    {/* Investor list */}
                    {roundInvs.length > 0 && (
                      <div className="divide-y divide-gray-50">
                        {roundInvs.map((inv, iIdx) => (
                          <div key={inv.id} className="px-5 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: INVESTOR_COLORS[iIdx % INVESTOR_COLORS.length] }}>
                              {inv.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{inv.name}</span>
                                {inv.percentage != null && (
                                  <span className={`text-sm font-bold ${meta.text}`}>{inv.percentage.toFixed(3)}%</span>
                                )}
                                {inv.amount != null && totalValuation > 0 && (
                                  <span className="text-sm text-gray-500">{fmt(inv.amount)}</span>
                                )}
                                {inv.pay_deadline && inv.pay_status !== 'paid' && (
                                  <span className={`text-xs ${new Date(inv.pay_deadline) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                    期限 {inv.pay_deadline}
                                  </span>
                                )}
                              </div>
                              {(inv.phone || inv.email) && (
                                <p className="text-xs text-gray-400 mt-0.5">{inv.phone}{inv.phone && inv.email ? ' · ' : ''}{inv.email}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => openEdit(inv)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 hover:text-indigo-600">編輯</button>
                              <button onClick={() => setDeleteConfirm(inv.id)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 hover:text-red-500">刪除</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Round subtotal */}
                    {isOpen && roundInvs.length > 0 && (
                      <div className="px-5 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex gap-4">
                        <span>本輪 {roundInvs.length} 位 · {used.toFixed(3)}%</span>
                        {totalValuation > 0 && <span>≈ {fmt(used / 100 * totalValuation)}</span>}
                      </div>
                    )}

                    {isOpen && roundInvs.length === 0 && (
                      <div className="px-5 py-4 text-xs text-gray-400 text-center">尚無此輪投資人</div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── Tab: Contract ── */}
        {tab === 'contract' && (
          <div className="space-y-4">
            {/* Hidden file input for per-investor contract upload */}
            <input
              ref={contractFileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleContractFile}
            />

            {/* Email sender settings — super_admin only */}
            {profile?.role === 'super_admin' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-bold text-gray-900 text-sm flex-1">合約寄送</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => sendContracts(true)}
                    disabled={sending || !investors.some(i => i.email && i.contract_url && !i.contract_sent)}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    {sending ? '寄送中...' : `一鍵寄給未寄出（${investors.filter(i => i.email && i.contract_url && !i.contract_sent).length} 位）`}
                  </button>
                  <button
                    onClick={() => sendContracts(false)}
                    disabled={sending || !investors.some(i => i.email && i.contract_url)}
                    className="border border-indigo-200 text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-50 disabled:opacity-40 transition-colors"
                  >
                    全部重寄
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">寄件人</label>
                <span className="text-sm text-gray-700 font-medium">james789852@gmail.com</span>
              </div>

              {/* Send results */}
              {sendResults.length > 0 && (
                <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 flex items-center justify-between">
                    <span>寄送結果 — 成功 {sendResults.filter(r => r.success).length} / {sendResults.length}</span>
                    <button onClick={() => setSendResults([])} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                    {sendResults.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] flex-shrink-0 ${r.success ? 'bg-teal-500' : 'bg-red-400'}`}>
                          {r.success ? '✓' : '✕'}
                        </span>
                        <span className="font-medium text-gray-800">{r.name}</span>
                        {!r.success && <span className="text-xs text-red-500">{r.reason}</span>}
                        {r.success && <span className="text-xs text-teal-500">已寄出</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* 批次設定繳款期限 & 合約日 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-3">批次設定（套用全部輪次）</h2>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">繳款期限</label>
                  <input type="date" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={batchDeadline} onChange={e => setBatchDeadline(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">合約日</label>
                  <input type="date" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={batchSignDate} onChange={e => setBatchSignDate(e.target.value)} />
                </div>
                <button
                  onClick={applyBatchDates}
                  disabled={applyingBatch || (!batchDeadline && !batchSignDate)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {applyingBatch ? '套用中...' : '套用到所有人'}
                </button>
                {batchApplied && (
                  <span className="text-sm text-teal-600 font-medium">✓ 已套用</span>
                )}
              </div>
            </div>

            {/* Single send result toast */}
            {singleSendResult && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${singleSendResult.success ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <span>{singleSendResult.success ? '✓' : '✕'}</span>
                <span className="font-medium">{singleSendResult.name}</span>
                <span>{singleSendResult.success ? '已成功寄出' : singleSendResult.reason}</span>
                {!singleSendResult.success && <span className="text-xs opacity-70">（請確認 Resend 網域已驗證，且 Email 位址正確）</span>}
              </div>
            )}

            {/* Contract table — rounds 1-3 grouped, round 4 separate */}
            {(() => {
              const { groups, round4 } = getContractGroups()
              const isGroupUploading = (g: ContractGroup) => uploadingGroupIds !== null && uploadingGroupIds[0] === g.ids[0]
              const ContractCell = ({ g }: { g: ContractGroup }) => g.contractUrl ? (
                <div className="flex items-center gap-1.5">
                  <a href={g.contractUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">查看</a>
                  <button onClick={() => triggerGroupUpload(g)} disabled={isGroupUploading(g)}
                    className="text-xs px-2 py-0.5 border border-gray-200 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 transition-colors">
                    {isGroupUploading(g) ? '上傳中...' : '換檔'}
                  </button>
                  <button onClick={() => quickUpdateGroup(g.ids, { contract_url: null })}
                    className="text-xs px-1.5 py-0.5 border border-gray-200 rounded-lg text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors">✕</button>
                </div>
              ) : (
                <button onClick={() => triggerGroupUpload(g)} disabled={isGroupUploading(g)}
                  className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 transition-colors">
                  {isGroupUploading(g) ? '上傳中...' : '+ 上傳'}
                </button>
              )
              return (
                <div className="space-y-4">
                  {/* Rounds 1-3 grouped */}
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs font-semibold text-indigo-700">第一、二、三輪（合併持股）</div>
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-gray-50">
                        <tr>{['姓名','輪次','合計持股%','合計金額','付款狀態','合約檔案','寄出','合約已寄','合約簽回'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {groups.map(g => (
                          <tr key={g.key} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-3 text-sm font-medium text-gray-900">
                              <div>{g.name}</div>
                              {g.email && <div className="text-[10px] text-gray-400">{g.email}</div>}
                              {g.payDeadline && <div className="text-[10px] text-orange-500 mt-0.5">繳款期限 {g.payDeadline}</div>}
                              {g.signDate && <div className="text-[10px] text-indigo-400 mt-0.5">合約日 {g.signDate}</div>}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-500">第{g.rounds.sort((a,b)=>a-b).join('、')}輪</td>
                            <td className="px-3 py-3 text-sm text-indigo-700 font-bold">{g.totalPct.toFixed(3)}%</td>
                            <td className="px-3 py-3 text-sm text-gray-700">{g.totalAmount ? fmt(g.totalAmount) : '—'}</td>
                            <td className="px-3 py-3">
                              <select value={g.payStatus}
                                onChange={e => quickUpdateGroup(g.ids, { pay_status: e.target.value as InvestorPayStatus })}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                                <option value="pending">待付款</option>
                                <option value="paid">已到位</option>
                                <option value="overdue">逾期</option>
                              </select>
                            </td>
                            <td className="px-3 py-3"><ContractCell g={g} /></td>
                            <td className="px-3 py-3">
                              {profile?.role === 'super_admin' && (
                              <button onClick={() => sendGroup(g)}
                                disabled={!g.email || !g.contractUrl || sendingId === g.key}
                                title={!g.email ? '無 Email' : !g.contractUrl ? '未上傳合約' : ''}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${g.email && g.contractUrl ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                {sendingId === g.key ? '寄送中' : '寄出'}
                              </button>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <button onClick={() => quickUpdateGroup(g.ids, { contract_sent: !g.contractSent })}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${g.contractSent ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500 hover:bg-teal-50'}`}>
                                {g.contractSent ? '✓ 已寄' : '未寄'}
                              </button>
                            </td>
                            <td className="px-3 py-3">
                              <button onClick={() => quickUpdateGroup(g.ids, { contract_signed: !g.contractSigned })}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${g.contractSigned ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500 hover:bg-teal-50'}`}>
                                {g.contractSigned ? '✓ 已簽' : '未簽'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {groups.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-gray-400">尚無第一至三輪投資人</td></tr>}
                      </tbody>
                    </table>
                    </div>
                  </div>

                  {/* Round 4 individual */}
                  {round4.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-2 bg-teal-50 border-b border-teal-100 text-xs font-semibold text-teal-700">第四輪（外部投資人）</div>
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-gray-50">
                          <tr>{['姓名','持股%','金額','合約檔案','寄出','合約已寄','合約簽回','付款狀態'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {round4.map(inv => (
                            <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-3 text-sm font-medium text-gray-900">
                                <div>{inv.name}</div>
                                {inv.email && <div className="text-[10px] text-gray-400">{inv.email}</div>}
                                {inv.pay_deadline && <div className="text-[10px] text-orange-500 mt-0.5">繳款期限 {inv.pay_deadline}</div>}
                                {inv.sign_date && <div className="text-[10px] text-indigo-400 mt-0.5">合約日 {inv.sign_date}</div>}
                              </td>
                              <td className="px-3 py-3 text-sm text-teal-700 font-medium">{inv.percentage?.toFixed(3) ?? '—'}%</td>
                              <td className="px-3 py-3 text-sm text-gray-700">{inv.amount ? fmt(inv.amount) : '—'}</td>
                              <td className="px-3 py-3">
                                {inv.contract_url ? (
                                  <div className="flex items-center gap-1.5">
                                    <a href={inv.contract_url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline">查看</a>
                                    <button onClick={() => triggerContractUpload(inv.id)} disabled={uploadingId === inv.id}
                                      className="text-xs px-2 py-0.5 border border-gray-200 rounded-lg text-gray-500 hover:border-teal-400 hover:text-teal-600 disabled:opacity-50 transition-colors">
                                      {uploadingId === inv.id ? '上傳中...' : '換檔'}
                                    </button>
                                    <button onClick={() => quickUpdate(inv.id, { contract_url: null })}
                                      className="text-xs px-1.5 py-0.5 border border-gray-200 rounded-lg text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors">✕</button>
                                  </div>
                                ) : (
                                  <button onClick={() => triggerContractUpload(inv.id)} disabled={uploadingId === inv.id}
                                    className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-400 hover:text-teal-600 disabled:opacity-50 transition-colors">
                                    {uploadingId === inv.id ? '上傳中...' : '+ 上傳'}
                                  </button>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {profile?.role === 'super_admin' && (
                                <button onClick={() => sendSingle(inv)}
                                  disabled={!inv.email || !inv.contract_url || sendingId === inv.id}
                                  className={`text-xs px-2.5 py-1 rounded-lg font-medium disabled:opacity-50 transition-colors ${inv.email && inv.contract_url ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                  {sendingId === inv.id ? '寄送中' : '寄出'}
                                </button>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <button onClick={() => quickUpdate(inv.id, { contract_sent: !inv.contract_sent })}
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${inv.contract_sent ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500 hover:bg-teal-50'}`}>
                                  {inv.contract_sent ? '✓ 已寄' : '未寄'}
                                </button>
                              </td>
                              <td className="px-3 py-3">
                                <button onClick={() => quickUpdate(inv.id, { contract_signed: !inv.contract_signed })}
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${inv.contract_signed ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500 hover:bg-teal-50'}`}>
                                  {inv.contract_signed ? '✓ 已簽' : '未簽'}
                                </button>
                              </td>
                              <td className="px-3 py-3">
                                <select value={inv.pay_status}
                                  onChange={e => quickUpdate(inv.id, { pay_status: e.target.value as InvestorPayStatus })}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                                  <option value="paid">已到位</option>
                                  <option value="pending">待付款</option>
                                  <option value="overdue">逾期</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* ── Round config modal ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">輪次人數設定</h2>
              <p className="text-xs text-gray-400 mt-0.5">決定每輪可參與的人數上限，用來計算每人持股上限</p>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'management' as const, label: '第一輪：管理人員', hint: `上限 = ${MAX_PCT}% ÷ 人數` },
                { key: 'r2' as const, label: '第二輪：管理人員追加', hint: '上限 = 第一輪剩餘 ÷ 人數' },
                { key: 'r3' as const, label: '第三輪：管理人員追加', hint: '上限 = 第二輪剩餘 ÷ 人數' },
                { key: 'r4' as const, label: '第四輪：外部投資人', hint: '上限 = 第三輪剩餘 ÷ 人數' },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="text-sm font-semibold text-gray-700">{label}</label>
                  <p className="text-xs text-gray-400 mb-1">{hint}</p>
                  <input type="number" min="0" step="1"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={rcDraft[key] || ''}
                    onChange={e => setRcDraft(d => ({ ...d, [key]: parseInt(e.target.value) || 0 }))}
                    placeholder="0（填 0 表示不開放此輪）"
                  />
                  {rcDraft[key] > 0 && (() => {
                    const limits: Record<string, number> = {
                      management: floor2(MAX_PCT / rcDraft.management),
                      r2: rcDraft.r2 > 0 ? floor2(afterR1 / rcDraft.r2) : 0,
                      r3: rcDraft.r3 > 0 ? floor2(afterR2 / rcDraft.r3) : 0,
                      r4: rcDraft.r4 > 0 ? floor2(afterR3 / rcDraft.r4) : 0,
                    }
                    const lim = limits[key]
                    return lim >= 0.01
                      ? <p className="text-xs text-indigo-600 mt-1">每人上限 {lim.toFixed(3)}%{totalValuation > 0 ? `（≈ ${fmt(lim / 100 * totalValuation)}）` : ''}</p>
                      : <p className="text-xs text-red-500 mt-1">每人不足 0.01%，此輪將不開放</p>
                  })()}
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-5 sm:px-6 pb-5 sm:pb-6">
              <button onClick={() => setShowSettings(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={saveRoundConfig} disabled={savingRc}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {savingRc ? '儲存中...' : '儲存設定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">確認刪除</h3>
            <p className="text-sm text-gray-600 mb-5">確定要刪除此股東？此操作無法復原。</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={() => del(deleteConfirm)} className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-600">刪除</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">{editId ? '編輯股東' : '新增股東'}</h2>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              {/* 從第一輪選擇（僅第二、三輪新增時顯示） */}
              {(form.round === '2' || form.round === '3') && !editId && byRound(1).length > 0 && (
                <div className="bg-indigo-50 rounded-xl p-3">
                  <label className="text-xs font-semibold text-indigo-700">從第一輪投資人選擇（自動帶入個人資料）</label>
                  <select
                    className="mt-1 w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={r1SourceId}
                    onChange={e => {
                      const selected = investors.find(i => i.id === e.target.value)
                      setR1SourceId(e.target.value)
                      if (selected) {
                        setForm(f => ({
                          ...f,
                          name: selected.name,
                          phone: selected.phone ?? '',
                          email: selected.email ?? '',
                          id_number: selected.id_number ?? '',
                          address: selected.address ?? '',
                        }))
                      }
                    }}
                  >
                    <option value="">— 選擇投資人（或手動輸入）—</option>
                    {byRound(1).map(i => (
                      <option key={i.id} value={i.id}>{i.name}{i.phone ? ` · ${i.phone}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700">姓名 *</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    onCompositionStart={() => { isComposing.current = true }}
                    onCompositionEnd={() => { isComposing.current = false }}
                    placeholder="股東姓名" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">輪次</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))}>
                    {ROUND_META.map(m => (
                      <option key={m.round} value={m.round}>{m.label}（{m.sub}）</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">持股 %</label>
                  <input type="number" step="0.01" min="0"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={form.percentage} onChange={e => setForm(f => ({ ...f, percentage: e.target.value }))}
                    placeholder="0.00" />
                  {maxForThisRound > 0 && (
                    <p className="text-xs text-gray-400 mt-1">此輪每人上限 <strong className="text-indigo-600">{maxForThisRound.toFixed(3)}%</strong></p>
                  )}
                  {previewAmount != null && previewAmount > 0 && (
                    <p className="text-xs text-indigo-600 mt-0.5">≈ {fmt(previewAmount)}</p>
                  )}
                  {form.percentage && maxForThisRound > 0 && parseFloat(form.percentage) > maxForThisRound && (
                    <p className="text-xs text-red-500 mt-0.5">⚠ 超過此輪每人上限 {maxForThisRound.toFixed(3)}%</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">電話</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Email</label>
                  <input type="email" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">身分證字號</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700">地址</label>
                  <input className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700">備註</label>
                  <textarea rows={2} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={save} disabled={saving || !form.name.trim()}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
