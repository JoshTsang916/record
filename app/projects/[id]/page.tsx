"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Project = {
  id: string; title: string; status: 'active'|'archived'; priority: number; tags: string[]; created_at: string; updated_at: string; file_path: string
}
type ProjectFile = { frontmatter: any, content: string }
type Task = { id: string; project_id: string; title: string; status: TaskStatus; priority: number; position: number; tags: string[]; created_at: string; updated_at: string; file_path: string }
type TaskStatus = 'backlog'|'todo'|'in_progress'|'blocked'|'done'|'archived'
const COLS: TaskStatus[] = ['backlog','todo','in_progress','blocked','done']

function statusZh(s: TaskStatus) {
  switch (s) {
    case 'backlog': return '待規劃'
    case 'todo': return '待做'
    case 'in_progress': return '進行中'
    case 'blocked': return '受阻'
    case 'done': return '完成'
    case 'archived': return '封存'
  }
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const id = params.id
  const path = search.get('path') || ''

  const [item, setItem] = useState<Project | null>(null)
  const [file, setFile] = useState<ProjectFile | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [q, setQ] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [includeDone, setIncludeDone] = useState(true)

  useEffect(() => { load() }, [id, includeDone])
  async function load() {
    const qs = path ? `?path=${encodeURIComponent(path)}` : `?id=${id}`
    const pr = await fetch(`/api/projects/read${qs}`, { cache: 'no-store' })
    if (pr.ok) { const j = await pr.json(); setItem(j.item); setFile(j.file) }
    const tr = await fetch(`/api/tasks/list?project_id=${id}&include_done=${includeDone ? 'true' : 'false'}`, { cache: 'no-store' })
    if (tr.ok) { const j = await tr.json(); setTasks(j.items || []) }
  }

  const grouped = useMemo(() => {
    const filter = (arr: Task[]) => arr.filter(t => (t.status!=='archived') && (!q || t.title.toLowerCase().includes(q.toLowerCase()))).sort((a,b)=> (a.position-b.position) || (b.priority-a.priority) || b.updated_at.localeCompare(a.updated_at))
    return {
      backlog: filter(tasks.filter(t=>t.status==='backlog')),
      todo: filter(tasks.filter(t=>t.status==='todo')),
      in_progress: filter(tasks.filter(t=>t.status==='in_progress')),
      blocked: filter(tasks.filter(t=>t.status==='blocked')),
      done: filter(tasks.filter(t=>t.status==='done')),
    }
  }, [tasks, q])

  function onDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  async function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    const tid = e.dataTransfer.getData('text/plain')
    if (!tid) return
    setTasks(prev => prev.map(t => t.id===tid ? { ...t, status } : t))
    const res = await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: tid, status }) })
    if (!res.ok) await load()
  }

  async function createTask() {
    if (!newTaskTitle.trim() || creatingTask) return
    setCreatingTask(true)
    const res = await fetch('/api/tasks/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: id, title: newTaskTitle, status: 'backlog' }) })
    if (res.ok) { setNewTaskTitle(''); await load() } else { alert('新增任務失敗') }
    setCreatingTask(false)
  }

  async function completeTask(taskId: string) {
    setTasks(prev => prev.map(t => t.id===taskId ? { ...t, status: 'done' } : t))
    const res = await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: taskId, status: 'done' }) })
    if (!res.ok) await load()
  }

  async function deleteTask(taskId: string) {
    if (!confirm('確定要刪除此任務嗎？此動作無法復原。')) return
    const prev = tasks
    setTasks(curr => curr.filter(t => t.id !== taskId))
    const res = await fetch('/api/tasks/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: taskId }) })
    if (!res.ok) { setTasks(prev); await load() }
  }

  async function saveProject() {
    if (!item || !file || saving) return
    setSaving(true)
    const body = { id: item.id, title: file.frontmatter.title, description: file.frontmatter.description, status: file.frontmatter.status, priority: file.frontmatter.priority, tags: file.frontmatter.tags, content: file.content }
    const res = await fetch('/api/projects/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) alert('儲存失敗')
    setSaving(false)
  }

  if (!item || !file) return <div className="p-4">Loading...</div>
  return (
    <div className="container py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">專案：{item.title}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={()=>router.push('/projects')}>返回</Button>
          <Button onClick={saveProject} disabled={saving}>{saving?'儲存中…':'儲存'}</Button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm">標題</label>
          <Input value={file.frontmatter.title} onChange={e=>setFile({ ...file, frontmatter: { ...file.frontmatter, title: e.target.value } })} />
          <label className="text-sm">描述</label>
          <textarea className="min-h-[120px] rounded-md border px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700" value={file.content} onChange={e=>setFile({ ...file, content: e.target.value })} />
          <div className="flex items-center gap-2">
            <label className="text-sm">狀態</label>
            <select value={file.frontmatter.status} onChange={e=>setFile({ ...file, frontmatter: { ...file.frontmatter, status: e.target.value as any } })} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700">
              <option value="active">進行中</option>
              <option value="archived">封存</option>
            </select>
            <label className="text-sm">優先度</label>
            <input type="number" min={1} max={5} value={file.frontmatter.priority} onChange={e=>setFile({ ...file, frontmatter: { ...file.frontmatter, priority: Number(e.target.value) } })} className="h-10 rounded-md border px-3 text-sm w-24 dark:bg-gray-900 dark:border-gray-700" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm">搜尋任務</label>
          <Input placeholder="輸入關鍵字" value={q} onChange={e=>setQ(e.target.value)} />
          <div className="flex items-center gap-2">
            <Input placeholder="新增任務標題" value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} />
            <Button onClick={createTask} disabled={creatingTask}>{creatingTask?'建立中…':'新增任務'}</Button>
          </div>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={includeDone} onChange={e=>setIncludeDone(e.target.checked)} /> 包含已完成</label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {COLS.map(col => (
          <div key={col} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-[300px] flex flex-col" onDragOver={onDragOver} onDrop={(e)=>onDrop(e, col)}>
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 text-sm font-medium flex items-center justify-between">
              <span>{statusZh(col)}</span>
              <span className="text-xs text-gray-500">{(grouped as any)[col].length}</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {(grouped as any)[col].map((t: Task) => (
                <Link key={t.id} href={{ pathname: `/tasks/${t.id}`, query: { path: t.file_path } }}>
                  <div draggable onDragStart={(e)=>onDragStart(e, t.id)} className={`rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 cursor-move max-w-full overflow-hidden ${t.status==='done' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium break-words whitespace-pre-wrap hover:underline">{t.title}</div>
                        <div className="mt-1 text-xs text-gray-500">優先度 {t.priority}</div>
                      </div>
                      <div className="shrink-0 flex gap-1">
                        <button title="完成" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); completeTask(t.id) }} className="h-7 px-2 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">完成</button>
                        <button title="刪除" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); deleteTask(t.id) }} className="h-7 px-2 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">刪除</button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
