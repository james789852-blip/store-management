'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Store, SopTrade, SopType } from '@/types'
import { SOP_TRADE_LABEL, SOP_TYPE_LABEL } from '@/types'

interface GeneratedCard {
  title: string
  trade: SopTrade
  type: SopType
  tags: string[]
  content: string
  selected?: boolean
}

const STEPS = ['選擇店面', '選擇資料', '分析中', '確認結果']

export default function SopAiPage() {
  const [step, setStep] = useState(0)
  const [stores, setStores] = useState<Pick<Store, 'id' | 'name' | 'status'>[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [sources, setSources] = useState({ schedule: true, logs: true, expenses: false, vendors: false })
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState<GeneratedCard[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('stores').select('id, name, status').order('created_at', { ascending: false }).then(({ data }) => setStores(data || []))
  }, [])

  async function generate() {
    if (!selectedStore) return
    setStep(2); setLoading(true); setError('')

    const fetchData = async (table: string, fields: string): Promise<unknown[]> => {
      const { data } = await supabase.from(table).select(fields).eq('store_id', selectedStore)
      return data || []
    }

    const [scheduleData, logData, expenseData, vendorData] = await Promise.all([
      sources.schedule ? fetchData('build_schedules', 'task_name,vendor,status,note') : Promise.resolve([] as unknown[]),
      sources.logs ? fetchData('construction_logs', 'date,task_name,vendor,status,issue,action') : Promise.resolve([] as unknown[]),
      sources.expenses ? fetchData('expenses', 'category,name,vendor,total,note') : Promise.resolve([] as unknown[]),
      sources.vendors ? fetchData('vendors', 'name,category,service,note') : Promise.resolve([] as unknown[]),
    ])

    try {
      const res = await fetch('/api/sop/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleData, logData, expenseData, vendorData }),
      })
      const json = await res.json()
      if (json.error) { setError(json.error); setStep(1); return }
      setCards(json.cards.map((c: GeneratedCard) => ({ ...c, selected: true })))
      setStep(3)
    } catch (e) {
      setError(String(e)); setStep(1)
    } finally {
      setLoading(false)
    }
  }

  async function saveSelected() {
    const toSave = cards.filter(c => c.selected)
    if (!toSave.length) return
    setSaving(true)
    await supabase.from('sop_knowledge').insert(toSave.map(c => ({
      trade: c.trade, type: c.type, title: c.title, tags: c.tags, content: c.content,
    })))
    setSaving(false); setSaved(true)
    setTimeout(() => { setSaved(false); setStep(0); setCards([]) }, 1500)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/sop" className="text-sm text-gray-400 hover:text-gray-700">← SOP 知識庫</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">AI 自動整理知識</h1>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${i === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px w-8 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">選擇要分析的店面</h2>
          <div className="space-y-2 mb-6">
            {stores.map(s => (
              <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedStore === s.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" className="accent-blue-600" checked={selectedStore === s.id} onChange={() => setSelectedStore(s.id)} />
                <span className="font-medium text-gray-900 text-sm">{s.name}</span>
              </label>
            ))}
          </div>
          <button disabled={!selectedStore} onClick={() => setStep(1)}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            下一步
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-2">選擇分析資料來源</h2>
          <p className="text-sm text-gray-400 mb-4">選擇越多資料，分析結果越豐富</p>
          <div className="space-y-3 mb-6">
            {[
              { key: 'schedule' as const, label: '建置排程', desc: '工項名稱、廠商、狀態' },
              { key: 'logs' as const, label: '施工日誌', desc: '異常記錄、處理方式（踩坑最多）' },
              { key: 'expenses' as const, label: '費用記錄', desc: '類別、金額、廠商' },
              { key: 'vendors' as const, label: '廠商資料', desc: '廠商聯絡與付款方式' },
            ].map(item => (
              <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${sources[item.key] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="checkbox" className="accent-blue-600" checked={sources[item.key]}
                  onChange={e => setSources(s => ({ ...s, [item.key]: e.target.checked }))} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">上一步</button>
            <button onClick={generate}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              開始分析
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-gray-900 mb-1">AI 分析中...</p>
          <p className="text-sm text-gray-400">正在分析建置資料，產出 SOP 知識卡片</p>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">產出 {cards.length} 筆知識卡片，選擇要存入知識庫的項目</p>
            <button onClick={() => setCards(c => c.map(x => ({ ...x, selected: !x.selected })))}
              className="text-sm text-blue-600 hover:underline">全選/取消</button>
          </div>
          <div className="space-y-3 mb-6">
            {cards.map((card, i) => (
              <label key={i} className={`block p-4 rounded-2xl border cursor-pointer transition-colors ${card.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 accent-blue-600" checked={!!card.selected}
                    onChange={e => setCards(c => c.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))} />
                  <div className="flex-1">
                    <div className="flex gap-2 flex-wrap mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{SOP_TRADE_LABEL[card.trade]}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{SOP_TYPE_LABEL[card.type]}</span>
                      {card.tags.map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>)}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm mb-1">{card.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-3 whitespace-pre-wrap">{card.content}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setStep(1); setCards([]) }} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">重新分析</button>
            <button onClick={saveSelected} disabled={saving || saved || !cards.some(c => c.selected)}
              className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {saved ? '✓ 已儲存' : saving ? '儲存中...' : `存入知識庫（${cards.filter(c => c.selected).length} 筆）`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
