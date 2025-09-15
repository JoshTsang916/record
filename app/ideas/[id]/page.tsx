"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ChipsInput from '@/components/chips-input'
import { Button } from '@/components/ui/button'

export default function IdeaDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const search = useSearchParams()
  const path = search.get('path') || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [importance, setImportance] = useState(3)
  const [status, setStatus] = useState<'draft'|'curating'|'todo'|'done'|'archived'>('draft')
  const [transcript, setTranscript] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<Array<{ id: string, title: string }>>([])

  useEffect(() => { load() }, [id])
  async function load() {
    try {
      const qs = path ? `?path=${encodeURIComponent(path)}` : `?id=${id}`
      const res = await fetch(`/api/read${qs}`)
      if (!res.ok) throw new Error('Failed to load')
      const j = await res.json()
      const fm = j.file.frontmatter
      setTitle(fm.title || '')
      setTags(fm.tags || [])
      setImportance(fm.importance || 3)
      setStatus(fm.status || 'draft')
      setTranscript(j.file.content || '')
      setAudioUrl(fm.audio?.url || '')
      setCreatedAt(fm.created_at)
      setProjectId(fm.project_id || '')
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
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, tags, importance, status, transcript, project_id: projectId })
    })
    if (!res.ok) {
      alert('儲存失敗')
    } else {
      // 成功後自動回首頁
      router.push('/')
    }
    setSaving(false)
  }

  async function onDelete() {
    if (!confirm('確定要刪除這筆靈感嗎？此動作無法復原。')) return
    const res = await fetch('/api/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
    })
    if (!res.ok) {
      try { const j = await res.json(); alert(j?.error || '刪除失敗') } catch { alert('刪除失敗') }
    } else {
      router.push('/')
    }
  }

  if (loading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="container py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">Created: {new Date(createdAt).toLocaleString()}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>返回</Button>
        </div>
      </div>
      {/* 不顯示音訊播放器（僅存文字模式） */}
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
        <label className="text-sm">Importance (1..5)</label>
        <input type="number" min={1} max={5} value={importance} onChange={e => setImportance(Number(e.target.value))} className="h-10 rounded-md border px-3 text-sm w-24 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
        <label className="text-sm">狀態</label>
        <select value={status} onChange={e => setStatus(e.target.value as any)} className="h-10 rounded-md border px-3 text-sm w-40 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
          <option value="draft">草稿</option>
          <option value="curating">整理中</option>
          <option value="todo">待辦</option>
          <option value="done">完成</option>
          <option value="archived">封存</option>
        </select>
        <label className="text-sm">Transcript</label>
        <Textarea value={transcript} onChange={e => setTranscript(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? '儲存中…' : '儲存'}</Button>
        <Button variant="outline" onClick={onDelete}>刪除</Button>
      </div>
    </div>
  )
}
