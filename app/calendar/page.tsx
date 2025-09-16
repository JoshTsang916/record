"use client"
import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Task = {
  id: string
  project_id: string
  title: string
  status: 'backlog'|'todo'|'in_progress'|'blocked'|'done'|'archived'
  priority: number
  position: number
  tags: string[]
  created_at: string
  updated_at: string
  due_date?: string
  file_path: string
}

export default function CalendarPage() {
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() } // m: 0..11
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [noDateTasks, setNoDateTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Array<{ id: string, title: string }>>([])
  const [projectId, setProjectId] = useState('')
  const [includeDone, setIncludeDone] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const { startDate, endDate, days } = useMemo(() => makeMonth(yearMonth.y, yearMonth.m), [yearMonth])

  useEffect(() => { load() }, [yearMonth, projectId, includeDone, statusFilter, tagFilter])
  async function load() {
    setLoading(true)
    try {
      // projects list (for filter)
      if (projects.length === 0) {
        try {
          const pr = await fetch('/api/projects/list', { cache: 'no-store' })
          if (pr.ok) {
            const pj = await pr.json(); setProjects((pj.items || []).map((x: any) => ({ id: x.id, title: x.title })))
          }
        } catch {}
      }
      const qs = new URLSearchParams()
      qs.set('from', startDate)
      qs.set('to', endDate)
      if (projectId) qs.set('project_id', projectId)
      if (statusFilter) qs.set('status', statusFilter)
      if (tagFilter) qs.set('tag', tagFilter)
      if (includeDone) qs.set('include_done', 'true')
      const res = await fetch(`/api/tasks/list?${qs.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json(); setTasks(j.items || [])
      }
      // fetch no-date tasks (nodate=true bypasses date range)
      const qs2 = new URLSearchParams()
      qs2.set('nodate', 'true')
      if (projectId) qs2.set('project_id', projectId)
      if (statusFilter) qs2.set('status', statusFilter)
      if (tagFilter) qs2.set('tag', tagFilter)
      if (includeDone) qs2.set('include_done', 'true')
      const res2 = await fetch(`/api/tasks/list?${qs2.toString()}`, { cache: 'no-store' })
      if (res2.ok) {
        const j2 = await res2.json(); setNoDateTasks(j2.items || [])
      }
    } finally { setLoading(false) }
  }

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const d = t.due_date || ''
      if (!d) continue
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(t)
    }
    for (const [k, arr] of map.entries()) arr.sort((a,b) => (b.priority - a.priority) || a.title.localeCompare(b.title))
    return map
  }, [tasks])

  function prevMonth() {
    setYearMonth(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })
  }
  function nextMonth() {
    setYearMonth(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })
  }
  function goToday() {
    const d = new Date(); setYearMonth({ y: d.getFullYear(), m: d.getMonth() })
  }

  function onDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  async function onDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    // optimistic update: move in local state
    setTasks(prev => prev.map(t => t.id === id ? { ...t, due_date: dateStr } : t))
    // if it was previously in no-date list, remove it optimistically
    setNoDateTasks(prev => prev.filter(t => t.id !== id))
    const res = await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, due_date: dateStr }) })
    if (!res.ok) {
      // revert by reloading
      await load()
    }
  }

  async function completeTask(task: Task) {
    setTasks(prev => prev.map(t => t.id===task.id ? { ...t, status: 'done' } : t))
    setNoDateTasks(prev => prev.map(t => t.id===task.id ? { ...t, status: 'done' } : t))
    const res = await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: 'done' }) })
    if (!res.ok) await load()
  }

  async function deleteTask(task: Task) {
    if (!confirm('確定要刪除此任務嗎？此動作無法復原。')) return
    const prevTasks = tasks
    const prevNoDate = noDateTasks
    setTasks(curr => curr.filter(t => t.id !== task.id))
    setNoDateTasks(curr => curr.filter(t => t.id !== task.id))
    const res = await fetch('/api/tasks/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, file_path: task.file_path }) })
    if (!res.ok) { setTasks(prevTasks); setNoDateTasks(prevNoDate); await load() }
  }

  return (
    <div className="container py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">任務日曆</div>
        <div className="flex items-center gap-2">
          <Link href="/"><Button variant="outline">返回列表</Button></Link>
          <Link href="/projects"><Button variant="outline">專案</Button></Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={prevMonth}>{'← 上一月'}</Button>
          <Button variant="outline" onClick={goToday}>今天</Button>
          <Button variant="outline" onClick={nextMonth}>{'下一月 →'}</Button>
        </div>
        <div className="ml-2 text-sm text-gray-700 dark:text-gray-200">{yearMonth.y} / {String(yearMonth.m + 1).padStart(2,'0')}</div>
        <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
          <option value="">全部專案</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
          <option value="">所有狀態</option>
          <option value="backlog">待規劃</option>
          <option value="todo">待做</option>
          <option value="in_progress">進行中</option>
          <option value="blocked">受阻</option>
          <option value="done">完成</option>
        </select>
        <select value={tagFilter} onChange={e=>setTagFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
          <option value="">所有標籤</option>
          {Array.from(new Set([...tasks, ...noDateTasks].flatMap(t=>t.tags||[]))).sort().map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={includeDone} onChange={e=>setIncludeDone(e.target.checked)} /> 包含已完成</label>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden">
        {['日','一','二','三','四','五','六'].map((w, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-900 p-2 text-xs font-medium text-gray-500">{w}</div>
        ))}
        {days.map((d, idx) => {
          const key = d.dateStr
          const list = byDate.get(key) || []
          const isToday = key === toDateStr(new Date())
          return (
            <div key={idx} className={`min-h-[120px] bg-white dark:bg-gray-950 p-2 ${isToday ? 'ring-2 ring-blue-500' : ''}`} onDragOver={onDragOver} onDrop={(e)=>onDrop(e, key)}>
              <div className={`text-xs mb-1 flex items-center justify-between ${d.inMonth ? '' : 'text-gray-400'}`}>
                <span>{d.day}</span>
                <button
                  className="text-[11px] px-1 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  title="新增當日任務"
                  onClick={async (e)=>{
                    e.preventDefault();
                    const title = window.prompt('任務標題？') || ''
                    if (!title.trim()) return
                    const body: any = { title, status: 'todo', due_date: key }
                    if (projectId) body.project_id = projectId
                    const res = await fetch('/api/tasks/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                    if (res.ok) await load(); else alert('建立失敗')
                  }}
                >+ 任務</button>
              </div>
              <div className="flex flex-col gap-1">
                {list.slice(0, 4).map(t => (
                  <TaskChip key={t.id} task={t} onDragStart={onDragStart} onComplete={completeTask} onDelete={deleteTask} />
                ))}
                {list.length > 4 && <div className="text-[11px] text-gray-500">+{list.length - 4} more</div>}
              </div>
            </div>
          )
        })}
      </div>
      {/* No-date zone */}
      <div className="mt-3 rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-3" onDragOver={onDragOver} onDrop={async (e)=>{
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain')
        if (!id) return
        setTasks(prev => prev.map(t => t.id===id ? { ...t, due_date: undefined } : t))
        setNoDateTasks(prev => prev.some(t=>t.id===id) ? prev : [{...(tasks.find(t=>t.id===id) as Task), due_date: undefined}, ...prev])
        const res = await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, due_date: '' }) })
        if (!res.ok) await load()
      }}>
        <div className="text-sm font-medium mb-2">無日期（拖曳任務到此以清除截止日）</div>
        <div className="flex flex-wrap gap-2">
          {noDateTasks.map(t => (
            <TaskChip key={t.id} task={t} onDragStart={onDragStart} onComplete={completeTask} onDelete={deleteTask} />
          ))}
          {noDateTasks.length === 0 && <div className="text-xs text-gray-500">目前沒有無日期任務</div>}
        </div>
      </div>
      {loading && <div className="text-sm text-gray-500">載入中…</div>}
    </div>
  )
}

function TaskChip({ task, onDragStart, onComplete, onDelete }: { task: Task, onDragStart: (e: React.DragEvent, id: string) => void, onComplete: (t: Task) => void, onDelete: (t: Task) => void }) {
  const color = useMemo(() => dueColor(task), [task])
  return (
    <div draggable onDragStart={(e)=>onDragStart(e, task.id)} className={`text-[11px] px-2 py-1 rounded border ${color.border} ${color.bg} cursor-move truncate flex items-center justify-between gap-1`} title={task.title}>
      <Link href={{ pathname: `/tasks/${task.id}`, query: { path: task.file_path } }} className="truncate flex-1 hover:underline">
        {task.title}
      </Link>
      <span className="shrink-0 inline-flex gap-1">
        <button title="完成" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); onComplete(task) }} className="px-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">✓</button>
        <button title="刪除" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); onDelete(task) }} className="px-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">🗑</button>
      </span>
    </div>
  )
}

function dueColor(task: Task) {
  if (!task.due_date) return { bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' }
  if (task.status === 'done') return { bg: 'bg-gray-100 opacity-60 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' }
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(task.due_date)
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000*60*60*24))
  if (diff < 0) return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-800' }
  if (diff === 0) return { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-800' }
  if (diff <= 3) return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-800' }
  return { bg: 'bg-gray-50 dark:bg-gray-900', border: 'border-gray-200 dark:border-gray-700' }
}

function makeMonth(year: number, month0: number) {
  const first = new Date(year, month0, 1)
  const last = new Date(year, month0 + 1, 0)
  const startWeek = new Date(first); startWeek.setDate(first.getDate() - first.getDay())
  const endWeek = new Date(last); endWeek.setDate(last.getDate() + (6 - last.getDay()))
  const days: Array<{ dateStr: string, day: number, inMonth: boolean }> = []
  for (let d = new Date(startWeek); d <= endWeek; d.setDate(d.getDate() + 1)) {
    days.push({ dateStr: toDateStr(d), day: d.getDate(), inMonth: d.getMonth() === month0 })
  }
  return { startDate: toDateStr(first), endDate: toDateStr(last), days }
}

function toDateStr(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}
