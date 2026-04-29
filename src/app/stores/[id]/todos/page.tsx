'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Todo } from '@/types'

const CATEGORIES = ['工程', '行政', '設備', '其他']
const PRIORITIES = ['高', '中', '低']
const STATUSES = ['待辦', '進行中', '完成']

const PRIORITY_COLOR: Record<string, string> = {
  '高': 'bg-red-100 text-red-600',
  '中': 'bg-amber-100 text-amber-700',
  '低': 'bg-gray-100 text-gray-500',
}

const STATUS_COLOR: Record<string, string> = {
  '待辦': 'bg-gray-100 text-gray-600',
  '進行中': 'bg-blue-100 text-blue-700',
  '完成': 'bg-green-100 text-green-700',
}

type TodoForm = {
  title: string; description: string; due_date: string
  priority: '高' | '中' | '低'
  status: '待辦' | '進行中' | '完成'
  category: '工程' | '行政' | '設備' | '其他'
}

function emptyForm(): TodoForm {
  return { title: '', description: '', due_date: '', priority: '中', status: '待辦', category: '工程' }
}

export default function TodosPage() {
  const { id } = useParams<{ id: string }>()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TodoForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('全部')

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('todos').select('*').eq('store_id', id).order('due_date', { ascending: true, nullsFirst: false })
    setTodos(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.title) return
    setSaving(true)
    const payload = {
      store_id: id,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      priority: form.priority,
      status: form.status,
      category: form.category,
    }
    if (editId) {
      await supabase.from('todos').update(payload).eq('id', editId)
    } else {
      await supabase.from('todos').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditId(null)
    setForm(emptyForm())
    load()
  }

  async function toggleStatus(todo: Todo) {
    const next = todo.status === '完成' ? '待辦' : '完成'
    await supabase.from('todos').update({ status: next }).eq('id', todo.id)
    load()
  }

  async function deleteTodo(todoId: string) {
    await supabase.from('todos').delete().eq('id', todoId)
    load()
  }

  function startEdit(todo: Todo) {
    setForm({
      title: todo.title,
      description: todo.description || '',
      due_date: todo.due_date || '',
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
    })
    setEditId(todo.id)
    setShowAdd(true)
  }

  const filtered = filter === '全部' ? todos : todos.filter(t => t.status === filter)
  const counts = { total: todos.length, done: todos.filter(t => t.status === '完成').length }

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">待辦事項</h1>
          <p className="text-sm text-gray-400 mt-0.5">{counts.done} / {counts.total} 已完成</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm()) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + 新增待辦
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {['全部', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium text-gray-600 mb-1">沒有符合的待辦</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(todo => {
            const isPast = todo.due_date && new Date(todo.due_date) < new Date() && todo.status !== '完成'
            return (
              <div key={todo.id} className={`bg-white rounded-2xl border border-gray-200 p-4 flex gap-3 group transition-opacity ${todo.status === '完成' ? 'opacity-60' : ''}`}>
                <button onClick={() => toggleStatus(todo)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${todo.status === '完成' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                  {todo.status === '完成' && <span className="text-white text-xs flex items-center justify-center w-full h-full">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-gray-800 ${todo.status === '完成' ? 'line-through text-gray-400' : ''}`}>{todo.title}</p>
                      {todo.description && <p className="text-xs text-gray-400 mt-0.5">{todo.description}</p>}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                      <button onClick={() => startEdit(todo)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編輯</button>
                      <button onClick={() => deleteTodo(todo.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">刪除</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[todo.priority]}`}>{todo.priority}優先</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[todo.status]}`}>{todo.status}</span>
                    <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{todo.category}</span>
                    {todo.due_date && (
                      <span className={`text-xs ${isPast ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {isPast ? '⚠ 逾期 ' : ''}{todo.due_date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="font-bold text-gray-900 text-lg mb-5">{editId ? '編輯待辦' : '新增待辦事項'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">標題 *</label>
                <input autoFocus className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && save()} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">說明</label>
                <textarea rows={2} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">分類</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as typeof form.category }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">優先度</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as typeof form.priority }))}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">到期日</label>
                  <input type="date" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">狀態</label>
                  <select className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowAdd(false); setEditId(null) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={save} disabled={!form.title || saving}
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
