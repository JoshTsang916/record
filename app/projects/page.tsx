"use client"
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type Project = {
  id: string
  title: string
  status: 'active'|'archived'
  priority: number
  tags: string[]
  created_at: string
  updated_at: string
  file_path: string
}

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([])
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [status, setStatus] = useState<'all'|'active'|'archived'>('all')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(3)
  const [tags, setTags] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    const res = await fetch('/api/projects/list', { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json(); setItems(j.items || [])
    }
  }

  const allTags = useMemo(() => Array.from(new Set(items.flatMap(i => i.tags))).sort(), [items])
  const filtered = useMemo(() => items.filter(i => {
    const matchQ = !q || i.title.toLowerCase().includes(q.toLowerCase())
    const matchTag = !tag || i.tags.includes(tag)
    const matchStatus = status==='all' || i.status===status
    return matchQ && matchTag && matchStatus
  }), [items, q, tag, status])

  async function createProject() {
    if (creating) return
    setCreating(true)
    const res = await fetch('/api/projects/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, priority, tags: tags.split(',').map(s=>s.trim()).filter(Boolean) }) })
    if (!res.ok) { alert('建立失敗'); setCreating(false); return }
    setOpen(false); setTitle(''); setDescription(''); setPriority(3); setTags('');
    await load(); setCreating(false)
  }

  return (
    <div className="container py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">專案</div>
        <div className="flex items-center gap-2">
          <Link href="/"><Button variant="outline">返回列表</Button></Link>
          <Button onClick={() => setOpen(true)}>新增專案</Button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Input placeholder="搜尋專案" value={q} onChange={e => setQ(e.target.value)} className="w-full sm:flex-1" />
        <select value={status} onChange={e => setStatus(e.target.value as any)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
          <option value="all">全部</option>
          <option value="active">進行中</option>
          <option value="archived">封存</option>
        </select>
        <select value={tag} onChange={e => setTag(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
          <option value="">All tags</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => (
          <Link key={p.id} href={{ pathname: `/projects/${p.id}`, query: { path: p.file_path } }}>
            <Card className="hover:shadow-md transition">
              <CardHeader>
                <div className="font-medium break-words whitespace-pre-wrap">{p.title}</div>
                <div className="text-xs text-gray-500">更新：{new Date(p.updated_at).toLocaleString()}</div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 dark:text-gray-300">優先度：{p.priority}・狀態：{p.status==='active'?'進行中':'封存'}</div>
                {p.tags.length>0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.tags.map(t => <span key={t} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-[10px] px-2 py-0.5">{t}</span>)}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 p-4 space-y-2">
            <div className="text-lg font-semibold">新增專案</div>
            <Input placeholder="標題" value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="h-24 rounded-md border px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700" placeholder="描述" value={description} onChange={e=>setDescription(e.target.value)} />
            <div className="flex items-center gap-2">
              <label className="text-sm">優先度</label>
              <input type="number" min={1} max={5} value={priority} onChange={e=>setPriority(Number(e.target.value))} className="h-10 rounded-md border px-3 text-sm w-24 dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <Input placeholder="標籤（逗號分隔）" value={tags} onChange={e=>setTags(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setOpen(false)} disabled={creating}>取消</Button>
              <Button onClick={createProject} disabled={creating}>{creating?'建立中…':'建立'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

