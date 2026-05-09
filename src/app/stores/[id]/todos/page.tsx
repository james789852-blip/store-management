'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Todo, TodoPriority } from '@/types'
import { TODO_PRIORITY_LABEL } from '@/types'
import { TODO_PRIORITY_BADGE, TODO_PRIORITY_DOT } from '@/lib/colors'

const CATEGORY_SUGGESTIONS = ['工程', '行政', '設備', '設計', '法規', '招募', '其他']

type DoneFilter = 'all' | 'undone' | 'done'
type GroupBy = 'category' | 'duedate'

const TODAY_STR = new Date().toISOString().slice(0, 10)

function getWeekBoundary(offsetWeeks: number) {
  const d = new Date()
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { mon: mon.toISOString().slice(0, 10), sun: sun.toISOString().slice(0, 10) }
}

function dueDateGroup(due: string | null, done: boolean): string {
  if (done) return '已完成'
  if (!due) return '無截止日'
  const thisWeek = getWeekBoundary(0)
  const nextWeek = getWeekBoundary(1)
  if (due < TODAY_STR) return '已逾期'
  if (due === TODAY_STR) return '今日'
  if (due <= thisWeek.sun) return '本週'
  if (due <= nextWeek.sun) return '下週'
  return '之後'
}

const DUE_GROUP_ORDER = ['已逾期', '今日', '本週', '下週', '之後', '無截止日', '已完成']
const DUE_GROUP_COLOR: Record<string, string> = {
  '已逾期': 'text-red-500',
  '今日': 'text-amber-600',
  '本週': 'text-blue-600',
  '下週': 'text-indigo-500',
  '之後': 'text-gray-500',
  '無截止日': 'text-gray-400',
  '已完成': 'text-gray-300',
}

type TodoForm = {
  title: string
  category: string
  priority: TodoPriority
  due_date: string
  note: string
}

function emptyForm(): TodoForm {
  return { title: '', category: '', priority: 'mid', due_date: '', note: '' }
}


function isOverdue(due: string | null, done: boolean) {
  if (!due || done) return false
  return due < new Date().toISOString().slice(0, 10)
}

export default function TodosPage() {
  const { id } = useParams<{ id: string }>()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [doneFilter, setDoneFilter] = useState<DoneFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TodoPriority>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('category')
  const [quickAdd, setQuickAdd] = useState('')
  const [quickAdding, setQuickAdding] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TodoForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const quickInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('store_id', id)
      .order('created_at', { ascending: true })
    setTodos(data || [])
    setLoading(false)
  }

  async function toggleDone(todo: Todo) {
    await supabase.from('todos').update({ done: !todo.done }).eq('id', todo.id)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
  }

  async function handleQuickAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !quickAdd.trim()) return
    setQuickAdding(true)
    await supabase.from('todos').insert({
      store_id: id,
      title: quickAdd.trim(),
      category: null,
      priority: 'mid' as TodoPriority,
      due_date: null,
      done: false,
      note: null,
    })
    setQuickAdd('')
    setQuickAdding(false)
    load()
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      store_id: id,
      title: form.title.trim(),
      category: form.category || null,
      priority: form.priority,
      due_date: form.due_date || null,
      done: false,
      note: form.note || null,
    }
    if (editId) {
      await supabase.from('todos').update(payload).eq('id', editId)
    } else {
      await supabase.from('todos').insert(payload)
    }
    setSaving(false)
    closeModal()
    load()
  }

  async function confirmDelete(todoId: string) {
    await supabase.from('todos').delete().eq('id', todoId)
    setDeleteConfirm(null)
    load()
  }

  function openAdd() {
    setForm(emptyForm())
    setEditId(null)
    setShowModal(true)
  }

  function startEdit(t: Todo) {
    setForm({
      title: t.title,
      category: t.category || '',
      priority: t.priority,
      due_date: t.due_date || '',
      note: t.note || '',
    })
    setEditId(t.id)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm())
  }

  // Derived
  const total = todos.length
  const doneCount = todos.filter(t => t.done).length

  const filtered = todos.filter(t => {
    const doneOk =
      doneFilter === 'all' ? true :
      doneFilter === 'done' ? t.done :
      !t.done
    const prioOk = priorityFilter === 'all' || t.priority === priorityFilter
    return doneOk && prioOk
  })

  // Grouping
  const grouped = filtered.reduce<Record<string, Todo[]>>((acc, t) => {
    const key = groupBy === 'duedate'
      ? dueDateGroup(t.due_date, t.done)
      : (t.category || '未分類')
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const ORDERED = ['工程', '行政', '設備', '設計', '法規', '招募', '其他']
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (groupBy === 'duedate') {
      return (DUE_GROUP_ORDER.indexOf(a) ?? 99) - (DUE_GROUP_ORDER.indexOf(b) ?? 99)
    }
    if (a === '未分類') return 1
    if (b === '未分類') return -1
    const ai = ORDERED.indexOf(a)
    const bi = ORDERED.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const progressPct = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  const inputCls = 'mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'text-xs font-medium text-gray-600'

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-400">載入中...</div>

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 mr-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">待辦事項</h1>
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {doneCount} / {total} 完成
              </span>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
            + 新增待辦
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Group-by toggle */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            {(['category', 'duedate'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-2 text-sm transition-colors ${groupBy === g ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {g === 'category' ? '依類別' : '依到期日'}
              </button>
            ))}
          </div>
          {/* Done filter tabs */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            {([['all', '全部'], ['undone', '未完成'], ['done', '已完成']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDoneFilter(val)}
                className={`px-3 py-2 text-sm transition-colors ${doneFilter === val ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
          {/* Priority dropdown */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as 'all' | TodoPriority)}
            className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">所有優先度</option>
            <option value="high">高優先</option>
            <option value="mid">中優先</option>
            <option value="low">低優先</option>
          </select>
        </div>

        {/* Quick add bar */}
        <div className="mb-6">
          <input
            ref={quickInputRef}
            type="text"
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            onKeyDown={handleQuickAdd}
            disabled={quickAdding}
            placeholder="快速新增待辦事項，按 Enter 儲存..."
            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 placeholder:text-gray-400"
          />
        </div>

        {/* Empty state */}
        {todos.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-4 select-none">&#10003;</div>
            <p className="text-lg font-medium text-gray-600 mb-1">尚無待辦事項</p>
            <p className="text-sm">在上方快速新增，或點擊「新增待辦」建立詳細事項</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-base font-medium text-gray-500">沒有符合篩選條件的待辦事項</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupKeys.map(group => (
              <div key={group}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    groupBy === 'duedate' ? (DUE_GROUP_COLOR[group] || 'text-gray-400') : 'text-gray-400'
                  }`}>{group}</span>
                  <span className="text-xs text-gray-300">{grouped[group].length}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Todo items */}
                <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
                  {grouped[group].map(todo => {
                    const overdue = isOverdue(todo.due_date, todo.done)
                    return (
                      <div
                        key={todo.id}
                        onClick={() => toggleDone(todo)}
                        className="group flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                        {/* Checkbox */}
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          todo.done
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-300 group-hover:border-blue-400'
                        }`}>
                          {todo.done && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-medium leading-snug ${todo.done ? 'line-through opacity-60 text-gray-500' : 'text-gray-800'}`}>
                              {todo.title}
                            </span>
                            {todo.category && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {todo.category}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TODO_PRIORITY_BADGE[todo.priority]}`}>
                              {TODO_PRIORITY_LABEL[todo.priority]}
                            </span>
                            {todo.due_date && (
                              <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                {overdue ? '已逾期 ' : ''}{todo.due_date}
                              </span>
                            )}
                          </div>
                          {todo.note && (
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{todo.note}</p>
                          )}
                        </div>

                        {/* Actions (hover) */}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); startEdit(todo) }}
                            className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">
                            編輯
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirm(todo.id) }}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1">
                            刪除
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-lg">{editId ? '編輯待辦' : '新增待辦'}</h2>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className={labelCls}>事項名稱 *</label>
                  <input
                    autoFocus
                    className={inputCls}
                    placeholder="例：申請消防安全設備許可"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) save() }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>類別</label>
                    <input
                      className={inputCls}
                      list="todo-category-list"
                      placeholder="例：行政"
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    />
                    <datalist id="todo-category-list">
                      {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelCls}>優先度</label>
                    <select
                      className={inputCls}
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value as TodoPriority }))}>
                      <option value="high">高</option>
                      <option value="mid">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>截止日期</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>備註</label>
                  <textarea
                    rows={3}
                    className={`${inputCls} resize-none`}
                    placeholder="補充說明..."
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  />
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={!form.title.trim() || saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
              <h2 className="font-bold text-gray-900 text-lg mb-2">確認刪除</h2>
              <p className="text-sm text-gray-500 mb-6">此操作無法復原，確定要刪除這筆待辦事項嗎？</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button
                  onClick={() => confirmDelete(deleteConfirm)}
                  className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors">
                  刪除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
