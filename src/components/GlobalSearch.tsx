'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── 結果型別 ──────────────────────────────────────────────────
type Group = '店面' | '廠商' | '設備' | '費用' | 'SOP 知識'

interface Result {
  key: string
  group: Group
  title: string
  subtitle?: string
  href: string
}

interface StoreRow { id: string; name: string; address: string | null }
interface VendorRow { id: string; name: string; service: string | null; category: string | null; store_id: string }
interface EquipRow { id: string; name: string; category: string | null; store_id: string }
interface ExpRow { id: string; name: string; vendor: string | null; total: number | null; store_id: string }
interface SopRow { id: string; title: string }

const GROUP_ORDER: Group[] = ['店面', '廠商', '設備', '費用', 'SOP 知識']

// 移除會破壞 PostgREST or() 語法的字元
function sanitize(s: string): string {
  return s.replace(/[,()%*]/g, ' ').trim()
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)

  // 開關:⌘K / Ctrl+K，以及自訂事件 open-search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setTerm(''); setActive(0); setOpen(o => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    function onOpen() { setTerm(''); setActive(0); setOpen(true) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-search', onOpen as EventListener)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-search', onOpen as EventListener)
    }
  }, [])

  // 開啟時聚焦(非 setState)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  // 搜尋(debounce)。setState 只發生在非同步 timer 內。
  useEffect(() => {
    if (!open) return
    const raw = sanitize(term)
    const t = setTimeout(async () => {
      setLoading(true)
      // 空字串:顯示所有店面當快速跳轉
      if (!raw) {
        const { data } = await supabase
          .from('stores').select('id,name,address')
          .order('created_at', { ascending: false }).limit(8)
        const rows = (data ?? []) as StoreRow[]
        setResults(rows.map(s => ({
          key: `store-${s.id}`, group: '店面', title: s.name,
          subtitle: s.address ?? undefined, href: `/stores/${s.id}/overview`,
        })))
        setActive(0); setLoading(false)
        return
      }
      const q = `%${raw}%`
      const [stores, vendors, equip, exp, sop] = await Promise.all([
        supabase.from('stores').select('id,name,address').or(`name.ilike.${q},address.ilike.${q}`).limit(6),
        supabase.from('vendors').select('id,name,service,category,store_id').or(`name.ilike.${q},service.ilike.${q}`).not('store_id', 'is', null).limit(6),
        supabase.from('equipment').select('id,name,category,store_id').ilike('name', q).limit(5),
        supabase.from('expenses').select('id,name,vendor,total,store_id').or(`name.ilike.${q},vendor.ilike.${q}`).limit(5),
        supabase.from('sop_knowledge').select('id,title').ilike('title', q).limit(6),
      ])
      const out: Result[] = []
      for (const s of (stores.data ?? []) as StoreRow[])
        out.push({ key: `store-${s.id}`, group: '店面', title: s.name, subtitle: s.address ?? undefined, href: `/stores/${s.id}/overview` })
      for (const v of (vendors.data ?? []) as VendorRow[])
        out.push({ key: `vendor-${v.id}`, group: '廠商', title: v.name, subtitle: [v.category, v.service].filter(Boolean).join(' · ') || undefined, href: `/stores/${v.store_id}/vendors` })
      for (const e of (equip.data ?? []) as EquipRow[])
        out.push({ key: `equip-${e.id}`, group: '設備', title: e.name, subtitle: e.category ?? undefined, href: `/stores/${e.store_id}/equipment` })
      for (const x of (exp.data ?? []) as ExpRow[])
        out.push({ key: `exp-${x.id}`, group: '費用', title: x.name, subtitle: [x.vendor, x.total ? `NT$ ${Number(x.total).toLocaleString()}` : ''].filter(Boolean).join(' · ') || undefined, href: `/stores/${x.store_id}/expenses` })
      for (const k of (sop.data ?? []) as SopRow[])
        out.push({ key: `sop-${k.id}`, group: 'SOP 知識', title: k.title, href: `/sop` })
      setResults(out)
      setActive(0)
      setLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [term, open])

  function go(r: Result) {
    setOpen(false)
    router.push(r.href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (composing.current) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) go(results[active]) }
  }

  if (!open) return null

  // 依群組排序後平鋪,並記錄每筆的全域索引供鍵盤選取
  const ordered = GROUP_ORDER.flatMap(g => results.filter(r => r.group === g))
  let idx = -1

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 搜尋輸入 */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4-4" />
          </svg>
          <input
            ref={inputRef}
            value={term}
            onChange={e => setTerm(e.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => { composing.current = true }}
            onCompositionEnd={() => { composing.current = false }}
            placeholder="搜尋店面、廠商、設備、費用、SOP…"
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
          />
          <kbd className="hidden sm:block text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* 結果 */}
        <div className="max-h-[52vh] overflow-y-auto py-2">
          {ordered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              {loading ? '搜尋中…' : term ? '找不到相符的資料' : '開始輸入以搜尋'}
            </p>
          ) : (
            GROUP_ORDER.map(group => {
              const items = ordered.filter(r => r.group === group)
              if (items.length === 0) return null
              return (
                <div key={group} className="px-2 mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1.5">{group}</p>
                  {items.map(r => {
                    idx++
                    const i = idx
                    return (
                      <button
                        key={r.key}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          i === active ? 'bg-accent-tint' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                          {r.subtitle && <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>}
                        </div>
                        <span className="text-[11px] text-gray-300 shrink-0">↵</span>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
          <span>↑↓ 選擇</span><span>↵ 前往</span><span className="ml-auto">⌘K 開關搜尋</span>
        </div>
      </div>
    </div>
  )
}
