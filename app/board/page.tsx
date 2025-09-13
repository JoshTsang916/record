"use client"
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

type Item = {
  id: string
  title: string
  created_at: string
  tags: string[]
  status: 'draft'|'curating'|'todo'|'done'|string
  importance: number
}

const STATUSES: Array<'draft'|'curating'|'todo'|'done'> = ['draft','curating','todo','done']

function statusZh(s: string) {
  switch (s) {
    case 'draft': return '草稿'
    case 'curating': return '整理中'
    case 'todo': return '待辦'
    case 'done': return '完成'
    default: return s
  }
}

export default function BoardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [saving, setSaving] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [])
  async function load() {
    const res = await fetch('/api/list', { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json()
      setItems(j.items || [])
    }
  }

  const tags = useMemo(() => Array.from(new Set(items.flatMap(i => i.tags))).sort(), [items])

  const grouped = useMemo(() => {
    const filter = (arr: Item[]) => arr.filter(i => {
      const matchQ = !q || (i.title?.toLowerCase().includes(q.toLowerCase()))
      const matchTag = !tag || i.tags.includes(tag)
      return matchQ && matchTag
    }).sort((a,b) => (b.importance - a.importance) || b.created_at.localeCompare(a.created_at))
    return {
      draft: filter(items.filter(i => i.status === 'draft')),
      curating: filter(items.filter(i => i.status === 'curating')),
      todo: filter(items.filter(i => i.status === 'todo')),
      done: filter(items.filter(i => i.status === 'done')),
    }
  }, [items, q, tag])

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault() }

  async function onDrop(e: React.DragEvent, status: 'draft'|'curating'|'todo'|'done') {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    // optimistic update
    setItems(prev => prev.map(it => it.id === id ? { ...it, status } : it))
    setSaving(s => new Set(s).add(id))
    const res = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    if (!res.ok) {
      // revert
      await load()
      try { const j = await res.json(); alert(j?.error || '更新失敗') } catch { alert('更新失敗') }
    }
    setSaving(s => { const n = new Set(s); n.delete(id); return n })
  }

  return (
    <div className="container py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-lg font-semibold">看板視圖</div>
        <Link href="/" className="text-sm underline">返回列表</Link>
      </div>
      <div className="mb-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Input placeholder="搜尋" value={q} onChange={e => setQ(e.target.value)} className="w-full sm:flex-1" />
        <select value={tag} onChange={e => setTag(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
          <option value="">All tags</option>
          {tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STATUSES.map(col => (
          <div key={col} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-[300px] flex flex-col" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col)}>
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 text-sm font-medium flex items-center justify-between">
              <span>{statusZh(col)}</span>
              <span className="text-xs text-gray-500">{grouped[col].length}</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {grouped[col].map(it => (
                <div key={it.id} draggable onDragStart={(e) => onDragStart(e, it.id)} className={`rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 cursor-move ${saving.has(it.id) ? 'opacity-50' : ''}`}>
                  <div className="text-sm font-medium truncate">{it.title || it.id}</div>
                  <div className="mt-1 text-xs text-gray-500">重要性 {it.importance}</div>
                  {it.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {it.tags.map(t => (
                        <span key={t} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-[10px] px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
