'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SOP_TRADE_LABEL, SOP_TYPE_LABEL, SOP_VENUE_LABEL } from '@/types'
import type { SopKnowledge, SopTrade, SopType, SopVenue } from '@/types'
import { SOP_TRADE_BADGE, SOP_TYPE_BADGE } from '@/lib/colors'
import Link from 'next/link'


const ALL_TRADES = Object.keys(SOP_TRADE_LABEL) as SopTrade[]
const ALL_TYPES = Object.keys(SOP_TYPE_LABEL) as SopType[]
const ALL_VENUES = Object.keys(SOP_VENUE_LABEL) as SopVenue[]

// 各場域常見的建置面向（新增時的建議,也可自己打）
const FACET_PRESETS: Record<SopVenue, string[]> = {
  kitchen: ['空間規劃／動線', '給排水／油脂截留', '排煙空調', '冷凍冷藏／冷鏈', '電力配電', '生產設備', '消防', '衛生／HACCP', '倉儲', '證照法規'],
  store: ['空間動線／座位', '水電', '排煙空調', '廚房設備', '外場／吧台', '招牌／門面', 'POS／網路／監視', '消防', '清潔驗收', '證照法規'],
  general: ['證照法規', '合約', '廠商', '預算', '其他'],
}

const VENUE_BADGE: Record<SopVenue, string> = {
  kitchen: 'bg-amber-100 text-amber-700',
  store: 'bg-blue-100 text-blue-700',
  general: 'bg-gray-100 text-gray-500',
}
const VENUE_ICON: Record<SopVenue, string> = { kitchen: '🍳', store: '🏪', general: '📋' }

type FormData = {
  venue: SopVenue
  facet: string
  trade: SopTrade
  type: SopType
  title: string
  tags: string
  content: string
}

const EMPTY_FORM: FormData = {
  venue: 'kitchen', facet: '', trade: 'general', type: 'spec', title: '', tags: '', content: '',
}

export default function SopPage() {
  const [items, setItems] = useState<SopKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [venueFilter, setVenueFilter] = useState<SopVenue | 'all'>('all')
  const [facetFilter, setFacetFilter] = useState<string>('all')
  const [tradeFilter, setTradeFilter] = useState<SopTrade | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<SopType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SopKnowledge | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [reading, setReading] = useState<SopKnowledge | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SopKnowledge | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('sop_knowledge')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(item: SopKnowledge) {
    setEditing(item)
    setForm({
      venue: item.venue,
      facet: item.facet ?? '',
      trade: item.trade,
      type: item.type,
      title: item.title,
      tags: item.tags.join(', '),
      content: item.content,
    })
    setReading(null)
    setShowModal(true)
  }

  async function save() {
    if (!form.title || !form.content) return
    setSaving(true)
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const payload = {
      venue: form.venue,
      facet: form.facet.trim() || null,
      trade: form.trade,
      type: form.type,
      title: form.title,
      tags,
      content: form.content,
    }
    if (editing) {
      await supabase.from('sop_knowledge').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('sop_knowledge').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  async function del() {
    if (!deleteTarget) return
    await supabase.from('sop_knowledge').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const tradeCounts = ALL_TRADES.reduce((acc, t) => {
    acc[t] = items.filter(i => i.trade === t).length
    return acc
  }, {} as Record<SopTrade, number>)

  // 場域過濾:央廚/店面時一併帶入「通用」；通用頁只看通用
  const matchVenue = (item: SopKnowledge) =>
    venueFilter === 'all' ? true :
    venueFilter === 'general' ? item.venue === 'general' :
    item.venue === venueFilter || item.venue === 'general'

  // 目前場域下實際用到的面向,做成 chip
  const venueItems = items.filter(matchVenue)
  const facetsInView = Array.from(new Set(venueItems.map(i => i.facet).filter(Boolean))) as string[]
  const venueCounts = ALL_VENUES.reduce((acc, v) => {
    acc[v] = items.filter(i => i.venue === v).length
    return acc
  }, {} as Record<SopVenue, number>)

  const filtered = items.filter(item => {
    if (!matchVenue(item)) return false
    if (facetFilter !== 'all' && item.facet !== facetFilter) return false
    if (tradeFilter !== 'all' && item.trade !== tradeFilter) return false
    if (typeFilter !== 'all' && item.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  const liveTags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

  const sidebarBtnCls = (active: boolean) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${
      active
        ? 'bg-gray-900 text-white shadow-md'
        : 'text-gray-600 hover:bg-gray-50'
    }`

  const mobilePillCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
      active ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`

  const venuePillCls = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
    }`

  const facetChipCls = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
      active ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-accent'
    }`

  const facetSuggestions = Array.from(new Set([...(FACET_PRESETS[form.venue] || []), ...facetsInView]))

  return (
    <div className="h-screen flex flex-col" style={{ background: '#F5F4F0' }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-gray-900"
        style={{ boxShadow: '0 4px 24px 0 rgba(139,92,246,0.25)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link href="/" className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors whitespace-nowrap">
                ← 返回
              </Link>
              <div className="w-px h-4 bg-white/20 hidden sm:block" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white leading-tight">SOP 知識庫</h1>
                <p className="text-xs text-violet-200">共 {items.length} 條知識</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/sop/ai"
                className="bg-white/15 border border-white/20 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-white/25 transition-colors flex items-center gap-1 backdrop-blur-sm">
                ✨ <span className="hidden sm:inline">AI 自動整理</span><span className="sm:hidden">AI</span>
              </Link>
              <button onClick={openAdd}
                className="bg-white text-violet-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold hover:bg-violet-50 transition-colors shadow-lg shadow-violet-900/20">
                + <span className="hidden sm:inline">新增知識</span><span className="sm:hidden">新增</span>
              </button>
            </div>
          </div>
          {/* Search bar — full width below title */}
          <div className="mt-2.5 sm:mt-3">
            <input
              type="text"
              placeholder="搜尋標題、標籤、內容..."
              className="w-full sm:max-w-xs border border-white/20 bg-white/15 text-white placeholder-white/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all backdrop-blur-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* ── Mobile filter bars (hidden on md+) ── */}
      <div className="md:hidden flex-shrink-0 bg-white border-b border-gray-200">
        {/* Trade filter */}
        <div className="overflow-x-auto px-4 py-2">
          <div className="flex gap-1.5">
            <button onClick={() => setTradeFilter('all')} className={mobilePillCls(tradeFilter === 'all')}>
              全部工種
            </button>
            {ALL_TRADES.map(t => (
              <button key={t} onClick={() => setTradeFilter(t)} className={mobilePillCls(tradeFilter === t)}>
                {SOP_TRADE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        {/* Type filter */}
        <div className="overflow-x-auto px-4 py-2 border-t border-gray-100">
          <div className="flex gap-1.5">
            <button onClick={() => setTypeFilter('all')} className={mobilePillCls(typeFilter === 'all')}>
              全部類型
            </button>
            {ALL_TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={mobilePillCls(typeFilter === t)}>
                {SOP_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 gap-6">

        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex w-52 flex-shrink-0 flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">工種</p>
            <button onClick={() => setTradeFilter('all')} className={sidebarBtnCls(tradeFilter === 'all')}
              style={tradeFilter === 'all' ? { boxShadow: '0 4px 12px 0 rgba(139,92,246,0.3)' } : {}}>
              <span>全部</span>
              <span className={`text-xs ${tradeFilter === 'all' ? 'text-violet-100' : 'text-gray-400'}`}>{items.length}</span>
            </button>
            {ALL_TRADES.map(t => (
              <button key={t} onClick={() => setTradeFilter(t)} className={sidebarBtnCls(tradeFilter === t)}
                style={tradeFilter === t ? { boxShadow: '0 4px 12px 0 rgba(139,92,246,0.3)' } : {}}>
                <span>{SOP_TRADE_LABEL[t]}</span>
                {tradeCounts[t] > 0 && (
                  <span className={`text-xs ${tradeFilter === t ? 'text-violet-100' : 'text-gray-400'}`}>{tradeCounts[t]}</span>
                )}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">類型</p>
            <button onClick={() => setTypeFilter('all')} className={sidebarBtnCls(typeFilter === 'all')}
              style={typeFilter === 'all' ? { boxShadow: '0 4px 12px 0 rgba(139,92,246,0.3)' } : {}}>
              全部
            </button>
            {ALL_TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={sidebarBtnCls(typeFilter === t)}
                style={typeFilter === t ? { boxShadow: '0 4px 12px 0 rgba(139,92,246,0.3)' } : {}}>
                {SOP_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {/* 場域切換 央廚 / 店面 / 通用 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-1 mb-3 flex gap-1 overflow-x-auto">
            <button onClick={() => { setVenueFilter('all'); setFacetFilter('all') }} className={venuePillCls(venueFilter === 'all')}>
              全部 <span className="opacity-60 text-xs">{items.length}</span>
            </button>
            {ALL_VENUES.map(v => (
              <button key={v} onClick={() => { setVenueFilter(v); setFacetFilter('all') }} className={venuePillCls(venueFilter === v)}>
                {VENUE_ICON[v]} {SOP_VENUE_LABEL[v]}
                {venueCounts[v] > 0 && <span className="opacity-60 text-xs">{venueCounts[v]}</span>}
              </button>
            ))}
          </div>

          {/* 建置面向 chips */}
          {facetsInView.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button onClick={() => setFacetFilter('all')} className={facetChipCls(facetFilter === 'all')}>全部面向</button>
              {facetsInView.map(f => (
                <button key={f} onClick={() => setFacetFilter(f)} className={facetChipCls(facetFilter === f)}>{f}</button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3 text-2xl">📚</div>
              <p className="text-gray-500 font-medium mb-1">
                {items.length === 0 ? '尚無 SOP 知識' : '找不到符合的知識'}
              </p>
              {items.length === 0 && (
                <button onClick={openAdd}
                  className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800">
                  + 新增第一條知識
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-6">
              {filtered.map(item => (
                <div key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setReading(item)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2 flex-wrap flex-1 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VENUE_BADGE[item.venue]}`}>
                        {VENUE_ICON[item.venue]} {SOP_VENUE_LABEL[item.venue]}
                      </span>
                      {item.facet && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent-tint text-accent">
                          {item.facet}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOP_TYPE_BADGE[item.type]}`}>
                        {SOP_TYPE_LABEL[item.type]}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(item)}
                        className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-accent shadow-sm">
                        編輯
                      </button>
                      <button onClick={() => setDeleteTarget(item)}
                        className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-500 shadow-sm">
                        刪除
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 leading-snug">{item.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-3 whitespace-pre-wrap">{item.content}</p>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── Reading modal ── */}
      {reading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VENUE_BADGE[reading.venue]}`}>
                    {VENUE_ICON[reading.venue]} {SOP_VENUE_LABEL[reading.venue]}
                  </span>
                  {reading.facet && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent-tint text-accent">{reading.facet}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOP_TRADE_BADGE[reading.trade]}`}>
                    {SOP_TRADE_LABEL[reading.trade]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOP_TYPE_BADGE[reading.type]}`}>
                    {SOP_TYPE_LABEL[reading.type]}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">{reading.title}</h2>
                <p className="text-xs text-gray-400 mt-1">{reading.created_at.slice(0, 10)}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(reading)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                  編輯
                </button>
                <button onClick={() => setReading(null)}
                  className="px-3 py-1.5 text-sm bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200">
                  關閉
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reading.content}</div>
              {reading.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-6 pt-4 border-t border-gray-100">
                  {reading.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl flex flex-col max-h-[92vh]">
            <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? '編輯知識' : '新增知識'}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">場域</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value as SopVenue }))}>
                    {ALL_VENUES.map(v => <option key={v} value={v}>{SOP_VENUE_LABEL[v]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">建置面向</label>
                  <input list="facet-suggestions"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    value={form.facet} onChange={e => setForm(f => ({ ...f, facet: e.target.value }))}
                    placeholder="例：給排水／油脂截留（可自己打）" />
                  <datalist id="facet-suggestions">{facetSuggestions.map(f => <option key={f} value={f} />)}</datalist>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">工種</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value as SopTrade }))}>
                    {ALL_TRADES.map(t => <option key={t} value={t}>{SOP_TRADE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">類型</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SopType }))}>
                    {ALL_TYPES.map(t => <option key={t} value={t}>{SOP_TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">標題 *</label>
                <input autoFocus
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="例：水電迴路標準規格說明" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">標籤（逗號分隔）</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="例：迴路, 110V, 220V" />
                {liveTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {liveTags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">內容 *</label>
                <textarea rows={8}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="詳細說明、步驟、注意事項..." />
              </div>
            </div>
            <div className="px-5 sm:px-6 pb-6 pt-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button onClick={save} disabled={!form.title || !form.content || saving}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 mb-2">確認刪除</h2>
            <p className="text-sm text-gray-500 mb-5">確定刪除「{deleteTarget.title}」？</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button onClick={del}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
