"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ChipsInput from '@/components/chips-input'
import { Button } from '@/components/ui/button'

type TaskStatus = 'backlog'|'todo'|'in_progress'|'blocked'|'done'|'archived'

export default function TaskDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const id = params.id
  const path = search.get('path') || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [priority, setPriority] = useState(3)
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<Array<{ id: string, title: string }>>([])
  const [createdAt, setCreatedAt] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])
  async function load() {
    try {
      const qs = path ? `?path=${encodeURIComponent(path)}` : `?id=${id}`
      const res = await fetch(`/api/tasks/read${qs}`)
      if (!res.ok) throw new Error('Failed to load')
      const j = await res.json()
      const fm = j.file.frontmatter
      setTitle(fm.title || '')
      setDescription(j.file.content || '')
      setTags(fm.tags || [])
      setPriority(fm.priority || 3)
      setStatus(fm.status || 'todo')
      setDueDate(fm.due_date || '')
      setProjectId(fm.project_id || '')
      setCreatedAt(fm.created_at)
      setUpdatedAt(fm.updated_at)
      try {
        const pr = await fetch('/api/projects/list', { cache: 'no-store' })
        if (pr.ok) {
          const pj = await pr.json()
          setProjects((pj.items || []).map((x: any) => ({ id: x.id, title: x.title })))
        }
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (saving) return
    setSaving(true)
    const res = await fetch('/api/tasks/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, description, tags, priority, status, due_date: dueDate, project_id: projectId })
    })
    if (!res.ok) alert('儲存失敗')
    setSaving(false)
  }

  async function onDelete() {
    if (!confirm('確定要刪除這筆任務嗎？此動作無法復原。')) return
    const res = await fetch('/api/tasks/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
    })
    if (!res.ok) {
      try { const j = await res.json(); alert(j?.error || '刪除失敗') } catch { alert('刪除失敗') }
    } else {
      router.push('/projects')
    }
  }

  if (loading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="container py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">Created: {new Date(createdAt).toLocaleString()}・Updated: {new Date(updatedAt).toLocaleString()}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={()=>router.back()}>返回</Button>
        </div>
      </div>
      <div className="grid gap-3">
        <label className="text-sm">Title</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} />
        <label className="text-sm">專案</label>
        <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="h-10 rounded-md border px-3 text-sm w-64 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
          <option value="">未指定</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <label className="text-sm">標籤</label>
        <ChipsInput value={tags} onChange={setTags} placeholder="新增標籤，Enter/逗號確定" />
        <div className="flex items-center gap-2">
          <label className="text-sm">優先度</label>
          <input type="number" min={1} max={5} value={priority} onChange={e => setPriority(Number(e.target.value))} className="h-10 rounded-md border px-3 text-sm w-24 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
          <label className="text-sm">狀態</label>
          <select value={status} onChange={e=>setStatus(e.target.value as TaskStatus)} className="h-10 rounded-md border px-3 text-sm w-48 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
            <option value="backlog">待規劃</option>
            <option value="todo">待做</option>
            <option value="in_progress">進行中</option>
            <option value="blocked">受阻</option>
            <option value="done">完成</option>
          </select>
          <label className="text-sm">截止日</label>
          <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
        </div>
        <label className="text-sm">Description</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? '儲存中…' : '儲存'}</Button>
        <Button variant="outline" onClick={onDelete}>刪除</Button>
      </div>
    </div>
  )
}
