"use client"
import { useEffect, useMemo, useState } from 'react'
import Navbar from '@/components/navbar'
import RecorderModal from '@/components/recorder'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

type Item = {
  id: string
  title: string
  created_at: string
  tags: string[]
  status: string
  importance: number
  audio_url: string
  file_path: string
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<'newest'|'importance'>('newest')
  const [showTextModal, setShowTextModal] = useState(false)
  const [newText, setNewText] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newTags, setNewTags] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    const res = await fetch('/api/list')
    if (res.ok) {
      const j = await res.json()
      setItems(j.items || [])
    }
  }

  const tags = useMemo(() => Array.from(new Set(items.flatMap(i => i.tags))).sort(), [items])
  const filtered = useMemo(() => {
    let arr = items.filter(i => {
      const matchQ = !q || (i.title?.toLowerCase().includes(q.toLowerCase()))
      const matchTag = !tag || i.tags.includes(tag)
      const matchStatus = !statusFilter || i.status === statusFilter
      return matchQ && matchTag && matchStatus
    })
    if (sortBy === 'importance') arr = [...arr].sort((a, b) => (b.importance - a.importance) || b.created_at.localeCompare(a.created_at))
    return arr
  }, [items, q, tag, statusFilter, sortBy])

  function statusZh(s: string) {
    switch (s) {
      case 'draft': return '草稿'
      case 'curating': return '整理中'
      case 'todo': return '待辦'
      case 'done': return '完成'
      default: return s
    }
  }

  async function onSaved() {
    await load()
  }

  async function createTextIdea() {
    const fd = new FormData()
    fd.append('title', newTitle)
    fd.append('tags', newTags)
    fd.append('text', newText)
    fd.append('wantTranscription', 'false')
    const res = await fetch('/api/capture', { method: 'POST', body: fd })
    if (res.ok) {
      setShowTextModal(false)
      setNewText(''); setNewTitle(''); setNewTags('')
      await load()
    } else {
      try { const j = await res.json(); alert(j?.error || 'Save failed') } catch { alert('Save failed') }
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Navbar onRecordClick={() => setOpen(true)} onNewText={() => setShowTextModal(true)} />
      <div className="container py-4 space-y-4">
        <div className="flex gap-2 items-center">
          <Input placeholder="Search ideas" value={q} onChange={e => setQ(e.target.value)} className="flex-1" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm">
            <option value="">所有狀態</option>
            <option value="draft">草稿</option>
            <option value="curating">整理中</option>
            <option value="todo">待辦</option>
            <option value="done">完成</option>
          </select>
          <select value={tag} onChange={e => setTag(e.target.value)} className="h-10 rounded-md border px-3 text-sm">
            <option value="">All tags</option>
            {tags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="h-10 rounded-md border px-3 text-sm">
            <option value="newest">最新優先</option>
            <option value="importance">重要性優先</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(it => (
            <Link key={it.id} href={`/ideas/${it.id}`}>
              <Card className="hover:shadow-md transition">
                <CardHeader>
                  <div className="font-medium truncate">{it.title || it.id}</div>
                  <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-300">重要性：{it.importance}・狀態：{statusZh(it.status)}</div>
                  <div className="mt-2 text-xs text-gray-600">Tags: {it.tags.join(', ')}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      <RecorderModal open={open} onClose={() => setOpen(false)} onSaved={() => onSaved()} />
      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-4 space-y-2">
            <h2 className="text-lg font-semibold">New Text Idea</h2>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" className="w-full h-10 rounded-md border px-3" />
            <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Write your idea..." className="w-full min-h-[120px] rounded-md border px-3 py-2 text-sm" />
            <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="Tags (comma)" className="w-full h-10 rounded-md border px-3" />
            <div className="flex justify-end gap-2">
              <button className="h-10 px-4 rounded-md border" onClick={() => setShowTextModal(false)}>Cancel</button>
              <button className="h-10 px-4 rounded-md bg-black text-white" onClick={createTextIdea}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
