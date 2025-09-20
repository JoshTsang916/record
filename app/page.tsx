"use client"
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
// Navbar is included globally in layout
import RecorderModal from '@/components/recorder'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToast } from '@/components/toast'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ChipsInput from '@/components/chips-input'
import { ATTRIBUTE_LABEL, ATTRIBUTE_ORDER, attributeColor, detectAttributes } from '@/lib/attributes'

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

type TaskItem = {
  id: string
  project_id: string
  title: string
  created_at: string
  updated_at: string
  tags: string[]
  status: 'backlog'|'todo'|'in_progress'|'blocked'|'done'|'archived'
  priority: number
  due_date?: string
  file_path: string
  recurring?: 'daily'
  effective_status?: 'backlog'|'todo'|'in_progress'|'blocked'|'done'|'archived'|string
  effective_completed_today?: boolean
  focus_exclude?: boolean
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [taskStatusFilter, setTaskStatusFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [taskAttrFilter, setTaskAttrFilter] = useState('')
  const [sortBy, setSortBy] = useState<'newest'|'importance'>('newest')
  const [taskSortBy, setTaskSortBy] = useState<'newest'|'priority'>('newest')
  const [view, setView] = useState<'ideas'|'tasks'|'all'>('ideas')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [newText, setNewText] = useState('')
  const [newKind, setNewKind] = useState<'idea'|'task'>('idea')
  const [newTitle, setNewTitle] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [newImportance, setNewImportance] = useState<number>(3)
  const [newStatus, setNewStatus] = useState<'draft'|'curating'|'todo'|'done'>('draft')
  const [creating, setCreating] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: string, title: string }>>([])
  const [newProjectId, setNewProjectId] = useState('')
  const { show } = useToast()

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (showTextModal) {
      ;(async () => {
        try {
          const res = await fetch('/api/projects/list', { cache: 'no-store' })
          if (res.ok) {
            const j = await res.json(); setProjects((j.items || []).map((x: any) => ({ id: x.id, title: x.title })))
          }
        } catch {}
      })()
    }
  }, [showTextModal])
  useEffect(() => {
    const onOpenText = () => setShowTextModal(true)
    const onOpenRecord = () => setOpen(true)
    if (typeof window !== 'undefined') {
      window.addEventListener('open-new-text' as any, onOpenText)
      window.addEventListener('open-record' as any, onOpenRecord)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-new-text' as any, onOpenText)
        window.removeEventListener('open-record' as any, onOpenRecord)
      }
    }
  }, [])
  async function load() {
    const res = await fetch('/api/list', { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json()
      setItems(j.items || [])
    }
    const today = (() => { const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}` })()
    const rt = await fetch(`/api/tasks/list?include_done=true&today=${encodeURIComponent(today)}`, { cache: 'no-store' })
    if (rt.ok) { const j = await rt.json(); setTasks(j.items || []) }
  }

  async function reloadUntilMissing(missingId: string, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      const res = await fetch('/api/list', { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        const arr: Item[] = j.items || []
        const exists = arr.some(x => x.id === missingId)
        setItems(arr)
        if (!exists) return
      }
      await new Promise(r => setTimeout(r, 250 * (i + 1)))
    }
  }

  async function reloadTasksUntilMissing(missingId: string, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      const rt = await fetch('/api/tasks/list?include_done=true', { cache: 'no-store' })
      if (rt.ok) {
        const j = await rt.json()
        const arr: TaskItem[] = j.items || []
        const exists = arr.some(x => x.id === missingId)
        setTasks(arr)
        if (!exists) return
      }
      await new Promise(r => setTimeout(r, 250 * (i + 1)))
    }
  }

  const tags = useMemo(() => {
    const pool: any[] = view === 'ideas' ? items : view === 'tasks' ? tasks : ([] as any[]).concat(items as any, tasks as any)
    return Array.from(new Set(pool.flatMap((i: any) => i.tags || []))).sort()
  }, [items, tasks, view])

  const filteredIdeas = useMemo(() => {
    let arr = items.filter(i => {
      const matchQ = !q || (i.title?.toLowerCase().includes(q.toLowerCase()))
      const matchTag = !tag || i.tags.includes(tag)
      const matchStatus = !statusFilter || i.status === statusFilter
      const matchArchived = showArchived ? true : i.status !== 'archived'
      return matchQ && matchTag && matchStatus && matchArchived
    })
    if (sortBy === 'importance') arr = [...arr].sort((a, b) => (b.importance - a.importance) || b.created_at.localeCompare(a.created_at))
    return arr
  }, [items, q, tag, statusFilter, sortBy, showArchived])

  const filteredTasks = useMemo(() => {
    let arr = tasks.filter(t => {
      const matchQ = !q || (t.title?.toLowerCase().includes(q.toLowerCase()))
      const matchTag = !tag || (t.tags || []).includes(tag)
      const eff = (t.effective_status as any) || t.status
      const matchStatus = !taskStatusFilter || eff === (taskStatusFilter as any)
      const matchDone = hideCompleted ? t.status !== 'done' : true
      const matchDoneEff = hideCompleted ? eff !== 'done' : true
      const attrs = detectAttributes(t.title || '')
      const matchAttr = !taskAttrFilter || attrs.includes(taskAttrFilter)
      return matchQ && matchTag && matchStatus && matchDone && matchDoneEff && matchAttr
    })
    if (taskSortBy === 'priority') arr = [...arr].sort((a,b)=> (b.priority - a.priority) || b.updated_at.localeCompare(a.updated_at))
    else arr = [...arr].sort((a,b)=> b.created_at.localeCompare(a.created_at))
    return arr
  }, [tasks, q, tag, taskStatusFilter, taskSortBy, hideCompleted, taskAttrFilter])

  function statusZh(s: string) {
    switch (s) {
      case 'draft': return '草稿'
      case 'curating': return '整理中'
      case 'todo': return '待辦'
      case 'done': return '完成'
      case 'archived': return '封存'
      default: return s
    }
  }

  function taskStatusZh(s: string) {
    switch (s) {
      case 'backlog': return '待規劃'
      case 'todo': return '待做'
      case 'in_progress': return '進行中'
      case 'blocked': return '受阻'
      case 'done': return '完成'
      case 'archived': return '封存'
      default: return s
    }
  }

  async function onSaved() {
    await load()
  }

  async function createTextIdea() {
    if (creating) return
    setCreating(true)
    let ok = false
    if (newKind === 'idea') {
      const fd = new FormData()
      fd.append('title', newTitle)
      fd.append('tags', newTags.join(','))
      fd.append('text', newText)
      fd.append('wantTranscription', 'false')
      fd.append('importance', String(newImportance))
      fd.append('status', newStatus)
      if (newProjectId) fd.append('project_id', newProjectId)
      const res = await fetch('/api/capture', { method: 'POST', body: fd })
      ok = res.ok
    } else {
      const body: any = {
        title: newTitle || (newText.slice(0, 80) || 'Untitled Task'),
        description: newText,
        project_id: newProjectId,
        priority: newImportance,
        status: newStatus === 'done' ? 'todo' : (newStatus === 'curating' || newStatus === 'draft' ? 'backlog' : 'todo'),
        tags: newTags
      }
      const res = await fetch('/api/tasks/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      ok = res.ok
    }
    if (ok) {
      setShowTextModal(false)
      setNewText(''); setNewTitle(''); setNewTags([]); setNewProjectId('')
      await load()
    } else {
      alert('Save failed')
    }
    setCreating(false)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Navbar moved to global layout; buttons still work via custom events */}
      <div className="container py-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} className="w-full sm:flex-1" />
          <div className="flex rounded-md border overflow-hidden">
            <button className={`px-3 text-sm ${view==='ideas'?'bg-black text-white dark:bg-gray-800':'bg-white dark:bg-gray-900'}`} onClick={()=>setView('ideas')}>Ideas</button>
            <button className={`px-3 text-sm ${view==='tasks'?'bg-black text-white dark:bg-gray-800':'bg-white dark:bg-gray-900'}`} onClick={()=>setView('tasks')}>Tasks</button>
            <button className={`px-3 text-sm ${view==='all'?'bg-black text-white dark:bg-gray-800':'bg-white dark:bg-gray-900'}`} onClick={()=>setView('all')}>All</button>
          </div>
          {view==='ideas' && (
            <>
              <select value={statusFilter} onChange={e => { const v = e.target.value; setStatusFilter(v); if (v==='archived') setShowArchived(true) }} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
                <option value="">所有狀態</option>
                <option value="draft">草稿</option>
                <option value="curating">整理中</option>
                <option value="todo">待辦</option>
                <option value="done">完成</option>
                <option value="archived">封存</option>
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> 顯示封存
              </label>
            </>
          )}
          {view==='tasks' && (
            <>
              <select value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
                <option value="">所有任務狀態</option>
                <option value="backlog">待規劃</option>
                <option value="todo">待做</option>
                <option value="in_progress">進行中</option>
                <option value="blocked">受阻</option>
                <option value="done">完成</option>
              </select>
              <select value={taskAttrFilter} onChange={e => setTaskAttrFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
                <option value="">所有屬性</option>
                {ATTRIBUTE_ORDER.map(key => (
                  <option key={key} value={key}>{ATTRIBUTE_LABEL[key]} ({key})</option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={hideCompleted} onChange={e=>setHideCompleted(e.target.checked)} /> 隱藏已完成
              </label>
            </>
          )}
          <select value={tag} onChange={e => setTag(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
            <option value="">All tags</option>
            {tags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {view==='ideas' && (
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
              <option value="newest">最新優先</option>
              <option value="importance">重要性優先</option>
            </select>
          )}
          {view==='tasks' && (
            <select value={taskSortBy} onChange={e => setTaskSortBy(e.target.value as any)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 w-full sm:w-auto">
              <option value="newest">最新優先</option>
              <option value="priority">優先度優先</option>
            </select>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(view==='ideas' || view==='all') && filteredIdeas.map(it => (
            <Link key={it.id} href={{ pathname: `/ideas/${it.id}`, query: { path: it.file_path } }}>
              <Card className="hover:shadow-md transition">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium break-words whitespace-pre-wrap">{it.title || it.id}</div>
                      <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
                    </div>
                    <div className="shrink-0 flex gap-1">
                      <button
                        title="轉為任務"
                        onClick={async (e) => {
                          e.preventDefault(); e.stopPropagation();
                          try {
                            // 讀取完整內容與 project_id
                            const rr = await fetch(`/api/read?path=${encodeURIComponent(it.file_path)}`)
                            if (!rr.ok) throw new Error('讀取內容失敗')
                            const data = await rr.json()
                            const fm = data.file.frontmatter || {}
                            const body: any = { title: it.title || it.id, description: data.file.content || '', project_id: fm.project_id || '', priority: it.importance || 3, tags: it.tags || [], status: it.status === 'done' ? 'done' : (it.status === 'todo' ? 'todo' : 'backlog') }
                            const res = await fetch('/api/tasks/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                            if (!res.ok) throw new Error('建立任務失敗')
                            if (confirm('任務已建立，是否封存此靈感？')) {
                              await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, status: 'archived' }) })
                            }
                            await load()
                          } catch (err: any) { alert(err?.message || '轉換失敗') }
                        }}
                        className="h-7 px-2 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >轉任務</button>
                      {it.status !== 'archived' ? (
                        <button
                          title="封存"
                          onClick={async (e) => {
                            e.preventDefault(); e.stopPropagation();
                            const prev = items
                            setItems(curr => curr.map(x => x.id === it.id ? { ...x, status: 'archived' } : x))
                            const r = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, status: 'archived' }) })
                            if (!r.ok) {
                              setItems(prev)
                              try { const j = await r.json(); alert(j?.error || '封存失敗') } catch { alert('封存失敗') }
                            } else {
                              await load()
                            }
                          }}
                          className="h-7 px-2 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >封存</button>
                      ) : (
                        <button
                          title="還原為草稿"
                          onClick={async (e) => {
                            e.preventDefault(); e.stopPropagation();
                            const prev = items
                            setItems(curr => curr.map(x => x.id === it.id ? { ...x, status: 'draft' } : x))
                            const r = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, status: 'draft' }) })
                            if (!r.ok) {
                              setItems(prev)
                              try { const j = await r.json(); alert(j?.error || '還原失敗') } catch { alert('還原失敗') }
                            } else {
                              await load()
                            }
                          }}
                          className="h-7 px-2 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >還原</button>
                      )}
                      <button
                        title="刪除"
                        onClick={async (e) => {
                          e.preventDefault(); e.stopPropagation();
                          if (!confirm('確定要刪除這筆靈感嗎？此動作無法復原。')) return;
                          const prev = items
                          setItems(curr => curr.filter(x => x.id !== it.id))
                          const res = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, file_path: it.file_path }) })
                          if (!res.ok) {
                            setItems(prev)
                            try { const j = await res.json(); alert(j?.error || '刪除失敗') } catch { alert('刪除失敗') }
                          } else {
                            await reloadUntilMissing(it.id)
                          }
                        }}
                        className="h-7 px-2 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >刪除</button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-300">重要性：{it.importance}・狀態：{statusZh(it.status)}</div>
                  {it.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {it.tags.map(t => (
                        <button
                          key={t}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTag(prev => prev === t ? '' : t) }}
                          className={`inline-flex items-center rounded-full text-xs px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 ${tag===t ? 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
                          title={tag===t ? `取消篩選：${t}` : `篩選：${t}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">Tags:</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
          {(view==='tasks' || view==='all') && filteredTasks.map(t => {
            const effStatus = (t.effective_status as any) || t.status
            const attrs = detectAttributes(t.title || '')
            let cardStyle: CSSProperties | undefined
            if (attrs.length === 1) {
              const color = attributeColor(attrs[0])
              cardStyle = { borderColor: color, borderWidth: '2px', borderStyle: 'solid' }
            } else if (attrs.length > 1) {
              const segment = 100 / attrs.length
              const stops = attrs.map((key, idx) => {
                const start = Math.round(idx * segment)
                const end = Math.round((idx + 1) * segment)
                return `${attributeColor(key)} ${start}% ${end}%`
              }).join(', ')
              cardStyle = { borderWidth: '2px', borderStyle: 'solid', borderImage: `linear-gradient(135deg, ${stops}) 1` }
            }
            return (
            <Link key={t.id} href={{ pathname: `/tasks/${t.id}`, query: { path: t.file_path } }}>
              <Card className={`hover:shadow-md transition relative ${effStatus==='done' ? 'opacity-60' : ''}`} style={cardStyle}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium break-words whitespace-pre-wrap">{t.title}</div>
                      <div className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</div>
                    </div>
                    <div className="shrink-0 flex gap-1">
                      <button
                        title="完成"
                        onClick={async (e) => {
                          e.preventDefault(); e.stopPropagation();
                          const prevStatus = effStatus
                          setTasks(curr => curr.map(x => x.id===t.id ? { ...x, status: 'done', effective_status: 'done', effective_completed_today: true } : x))
                          const res = await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: 'done' }) })
                          if (!res.ok) await load()
                          show({ message: `已完成：${t.title}`, actionLabel: '撤銷', onAction: async () => {
                            setTasks(curr => curr.map(x => x.id===t.id ? { ...x, status: prevStatus, effective_status: prevStatus, effective_completed_today: false } : x))
                            await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: prevStatus }) })
                          } })
                        }}
                        className="h-7 px-2 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >完成</button>
                      <button
                        title="刪除任務"
                        onClick={async (e) => {
                          e.preventDefault(); e.stopPropagation();
                          // delayed commit with undo
                          const prev = tasks
                          setTasks(curr => curr.filter(x => x.id !== t.id))
                          let canceled = false
                          const timer = setTimeout(async () => {
                            if (canceled) return
                            await fetch('/api/tasks/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, file_path: t.file_path }) })
                            await reloadTasksUntilMissing(t.id)
                          }, 3000)
                          show({ message: `已刪除：${t.title}`, actionLabel: '撤銷', onAction: () => {
                            canceled = true
                            clearTimeout(timer)
                            setTasks(prev)
                          }, duration: 3000 })
                        }}
                        className="h-7 px-2 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >刪除</button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-300">優先度：{t.priority}・狀態：{taskStatusZh(effStatus)}{t.due_date ? `・到期：${t.due_date}` : ''}</div>
                  {(t.tags||[]).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {t.tags.map(tagName => (
                        <span key={tagName} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-[10px] px-2 py-0.5">{tagName}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">Tags:</div>
                  )}
                </CardContent>
                {attrs.length > 0 && (
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {attrs.slice(0,3).map(key => (
                      <span
                        key={key}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold text-white shadow-sm"
                        style={{ backgroundColor: attributeColor(key) }}
                        title={ATTRIBUTE_LABEL[key] || key}
                      >
                        {key === 'EV' ? 'EV' : key.charAt(0)}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          )})}
        </div>
      </div>
      <RecorderModal open={open} onClose={() => setOpen(false)} onSaved={() => onSaved()} />
      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 p-4 space-y-2">
            <h2 className="text-lg font-semibold">New Text</h2>
            <div className="flex items-center gap-2 text-sm">
              <label className={`px-2 py-1 rounded border ${newKind==='idea'?'bg-black text-white dark:bg-gray-800':'bg-transparent'}`}><input type="radio" name="new-kind" className="hidden" checked={newKind==='idea'} onChange={()=>setNewKind('idea')} /> Idea</label>
              <label className={`px-2 py-1 rounded border ${newKind==='task'?'bg-black text-white dark:bg-gray-800':'bg-transparent'}`}><input type="radio" name="new-kind" className="hidden" checked={newKind==='task'} onChange={()=>setNewKind('task')} /> Task</label>
            </div>
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" />
            <Textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Write your idea..." />
            <ChipsInput value={newTags} onChange={setNewTags} placeholder="新增標籤，Enter/逗號確定" />
            {newKind==='task' && (
              <>
                <label className="text-sm">專案</label>
                <select value={newProjectId} onChange={e=>setNewProjectId(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700">
                  <option value="">未指定</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </>
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm">重要性</label>
              <input type="number" min={1} max={5} value={newImportance} onChange={e => setNewImportance(Number(e.target.value))} className="h-10 rounded-md border px-3 text-sm w-24 dark:bg-gray-900 dark:border-gray-700" />
              <label className="text-sm">狀態</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700">
                <option value="draft">草稿</option>
                <option value="curating">整理中</option>
                <option value="todo">待辦</option>
                <option value="done">完成</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="h-10 px-4 rounded-md border" onClick={() => setShowTextModal(false)} disabled={creating}>Cancel</button>
              <button className="h-10 px-4 rounded-md bg-black text-white disabled:opacity-50" onClick={createTextIdea} disabled={creating}>{creating ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
