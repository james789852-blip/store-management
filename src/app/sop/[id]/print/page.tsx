'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { SOPDocument, SOPStep } from '@/types'

export default function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<SOPDocument | null>(null)
  const [steps, setSteps] = useState<SOPStep[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: docData }, { data: stepsData }] = await Promise.all([
        supabase.from('sop_documents').select('*').eq('id', id).single(),
        supabase.from('sop_steps').select('*').eq('document_id', id).order('order_index'),
      ])
      setDoc(docData)
      setSteps(stepsData || [])
      setReady(true)
    }
    load()
  }, [id])

  useEffect(() => {
    if (ready && doc) {
      setTimeout(() => window.print(), 600)
    }
  }, [ready, doc])

  if (!ready) return <div style={{ padding: 40, color: '#999' }}>載入中...</div>
  if (!doc) return <div style={{ padding: 40, color: '#999' }}>找不到文件</div>

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, 'PingFang TC', sans-serif; color: #111; background: white; }
        .no-print { display: block; }
        @media print {
          .no-print { display: none !important; }
          .step-card { break-inside: avoid; }
          body { font-size: 11pt; }
        }
        .container { max-width: 800px; margin: 0 auto; padding: 40px; }
        .top-bar { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
        .print-btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }
        .doc-header { border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 28px; }
        .doc-title { font-size: 26px; font-weight: 700; color: #111; margin-bottom: 6px; }
        .doc-meta { display: flex; gap: 16px; align-items: center; margin-bottom: 10px; }
        .category-badge { font-size: 11px; background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
        .doc-description { color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 8px; }
        .doc-date { color: #9ca3af; font-size: 12px; margin-top: 6px; }
        .steps-title { font-size: 14px; font-weight: 600; color: #6b7280; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
        .step-card { display: flex; gap: 16px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
        .step-number { width: 34px; height: 34px; background: #2563eb; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .step-body { flex: 1; }
        .step-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
        .step-title { font-size: 15px; font-weight: 600; color: #111; }
        .step-days { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; }
        .step-responsible { font-size: 11px; color: #1d4ed8; background: #eff6ff; padding: 2px 8px; border-radius: 4px; }
        .step-content { font-size: 13px; color: #374151; line-height: 1.7; white-space: pre-wrap; }
        .step-notes { font-size: 12px; color: #9ca3af; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
      `}</style>

      <div className="container">
        <div className="top-bar no-print">
          <span style={{ fontSize: 13, color: '#6b7280' }}>列印對話框將自動開啟 → 選「儲存為 PDF」即可下載</span>
          <button className="print-btn" onClick={() => window.print()}>重新列印 / 下載 PDF</button>
        </div>

        <div className="doc-header">
          <h1 className="doc-title">{doc.title}</h1>
          <div className="doc-meta">
            {doc.category && <span className="category-badge">{doc.category}</span>}
          </div>
          {doc.description && <p className="doc-description">{doc.description}</p>}
          <p className="doc-date">製作日期：{new Date(doc.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <p className="steps-title">共 {steps.length} 個步驟</p>

        {steps.map((step, idx) => (
          <div key={step.id} className="step-card">
            <div className="step-number">{idx + 1}</div>
            <div className="step-body">
              <div className="step-header">
                <span className="step-title">{step.title}</span>
                {step.estimated_days && (
                  <span className="step-days">⏱ {step.estimated_days} 天</span>
                )}
                {step.responsible && (
                  <span className="step-responsible">👤 {step.responsible}</span>
                )}
              </div>
              {step.content && <p className="step-content">{step.content}</p>}
              {step.notes && <p className="step-notes">📌 {step.notes}</p>}
            </div>
          </div>
        ))}

        <div className="footer">店面建置管理系統｜store-management-xi-seven.vercel.app</div>
      </div>
    </>
  )
}
