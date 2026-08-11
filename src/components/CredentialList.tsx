'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StoreCredential } from '@/types'

type CatKey = 'pos' | 'network' | 'cctv' | 'other'
type Tone = { bg: string; fg: string }

const CATS: { key: CatKey; title: string; hint?: string; icon: string; tone: Tone; presets: string[] }[] = [
  {
    key: 'pos', title: 'POS 系統', hint: '不同店可用不同系統（iChef / 肚肚 / 柿子紅…）',
    icon: 'M4 5h16v10H4zM8 19h8M12 15v4', tone: { bg: '#E3EEF8', fg: '#185FA5' },
    presets: ['POS 系統名稱', '前台帳號', '前台密碼', '後台帳號', '後台密碼', 'PIN 碼', '出單機型號', 'Apple ID', 'Apple 密碼'],
  },
  {
    key: 'network', title: '網路 Wi-Fi',
    icon: 'M4.5 11.5a11 11 0 0115 0M7.5 14.5a6.5 6.5 0 019 0M12 18h.01', tone: { bg: '#E4F5EE', fg: '#1D9E75' },
    presets: ['Wi-Fi 帳號 / SSID', 'Wi-Fi 密碼', '數據機帳號', '數據機密碼'],
  },
  {
    key: 'cctv', title: '監視系統',
    icon: 'M15 10l4.6-2.3a1 1 0 011.4.9v6.8a1 1 0 01-1.4.9L15 14M5 8h8a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z', tone: { bg: '#FBE9E9', fg: '#D94F4F' },
    presets: ['IP / 域名', 'HTTP 埠', '使用者名稱', '密碼'],
  },
  {
    key: 'other', title: '其他帳密', hint: '外送平台、金流後台、社群帳號…都可以加',
    icon: 'M15 7a4 4 0 11-4.9 3.9L4 17v3h3l1-1h2l1-2 2.1-2.1A4 4 0 0015 7z', tone: { bg: '#F1F2F4', fg: '#6B7280' },
    presets: ['Uber Eats 後台', 'foodpanda 後台', 'LINE 官方帳號', 'Google 商家'],
  },
]

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent'

type Draft = { category: CatKey; label: string; value: string }

export default function CredentialList({ storeId, onCountChange }: { storeId: string; onCountChange?: (n: number) => void }) {
  const [rows, setRows] = useState<StoreCredential[]>([])
  const [addCat, setAddCat] = useState<CatKey | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ category: 'pos', label: '', value: '' })
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { load() }, [storeId]) // eslint-disable-line

  async function load() {
    const { data } = await supabase.from('store_credentials').select('*').eq('store_id', storeId).order('sort_order').order('created_at')
    const list = (data || []) as StoreCredential[]
    setRows(list)
    onCountChange?.(list.filter(r => r.value && r.value.trim()).length)
  }

  function startAdd(cat: CatKey) { setEditId(null); setAddCat(cat); setDraft({ category: cat, label: '', value: '' }) }
  function startEdit(c: StoreCredential) { setAddCat(null); setEditId(c.id); setDraft({ category: c.category as CatKey, label: c.label, value: c.value ?? '' }) }
  function cancel() { setAddCat(null); setEditId(null); setDraft({ category: 'pos', label: '', value: '' }) }

  async function saveDraft() {
    if (!draft.label.trim()) return
    setBusy(true)
    const payload = { store_id: storeId, category: draft.category, label: draft.label.trim(), value: draft.value.trim() || null }
    if (editId) await supabase.from('store_credentials').update(payload).eq('id', editId)
    else await supabase.from('store_credentials').insert({ ...payload, sort_order: rows.length })
    setBusy(false); cancel(); load()
  }

  async function remove(id: string) {
    if (!confirm('刪除這個欄位？')) return
    await supabase.from('store_credentials').delete().eq('id', id)
    load()
  }

  async function copy(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1200) } catch { /* ignore */ }
  }

  function editor(cat: CatKey) {
    const preset = CATS.find(c => c.key === cat)!.presets
    return (
      <div className="border border-accent rounded-xl p-3 space-y-2 bg-accent-tint/40">
        <div className="flex flex-wrap gap-1.5">
          {preset.map(p => (
            <button key={p} onClick={() => setDraft(d => ({ ...d, label: p }))}
              className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${draft.label === p ? 'bg-accent text-white border-accent' : 'bg-white text-gray-500 border-gray-200 hover:border-accent'}`}>
              {p}
            </button>
          ))}
        </div>
        <input className={inputCls} autoFocus placeholder="欄位名稱 *（可自己打,例:前台密碼、PIN 碼、Apple ID）" value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
        <input className={inputCls} placeholder="內容 / 帳號 / 密碼" value={draft.value} onChange={e => setDraft(d => ({ ...d, value: e.target.value }))} />
        <div className="flex gap-2 pt-1">
          <button onClick={cancel} className="lp-btn-ghost flex-1 py-1.5 text-xs">取消</button>
          <button onClick={saveDraft} disabled={busy || !draft.label.trim()} className="lp-btn-primary flex-1 py-1.5 text-xs">{busy ? '儲存中...' : '儲存'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {CATS.map(cat => {
        const items = rows.filter(r => r.category === cat.key)
        return (
          <div key={cat.key} className="lp-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cat.tone.bg }}>
                <svg className="w-5 h-5" fill="none" stroke={cat.tone.fg} viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800">{cat.title}</h3>
                {cat.hint && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{cat.hint}</p>}
              </div>
              {!(addCat === cat.key) && !editId && (
                <button onClick={() => startAdd(cat.key)} className="ml-auto text-xs text-accent hover:opacity-70 font-medium shrink-0">＋ 新增欄位</button>
              )}
            </div>

            <div className="space-y-1">
              {items.map(c => editId === c.id ? (
                <div key={c.id}>{editor(cat.key)}</div>
              ) : (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 group transition-colors">
                  <span className="text-sm text-gray-500 w-28 sm:w-32 shrink-0 truncate">{c.label}</span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{c.value || <span className="text-gray-300">未填</span>}</span>
                  {c.value && (
                    <button onClick={() => copy(c.id, c.value!)} className="shrink-0 text-[11px] px-1.5 py-1 rounded-md text-gray-400 hover:text-accent hover:bg-white transition-colors" aria-label="複製">
                      {copied === c.id ? '已複製' : '複製'}
                    </button>
                  )}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => startEdit(c)} className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-white transition-colors" aria-label="編輯">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => remove(c.id)} className="p-1.5 text-gray-400 hover:text-brand-red rounded-lg hover:bg-white transition-colors" aria-label="刪除">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}

              {items.length === 0 && addCat !== cat.key && (
                <p className="text-sm text-gray-300 text-center py-3">尚無欄位，點右上「＋ 新增欄位」</p>
              )}
              {addCat === cat.key && editor(cat.key)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
