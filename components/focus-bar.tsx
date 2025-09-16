"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useToast } from './toast'

type Task = {
  id: string
  title: string
  project_id: string
  status: 'backlog'|'todo'|'in_progress'|'blocked'|'done'|'archived'
  priority: number
  file_path: string
}

type Session = {
  taskId: string
  taskTitle: string
  file_path: string
  project_id: string
  startedAt: number // epoch ms
  durationSec: number
  pausedAt?: number
  pausedAccumSec: number
  rerollUsed?: boolean
}

export default function FocusBar() {
  const { show } = useToast()
  const [session, setSession] = useState<Session | null>(null)
  const [remaining, setRemaining] = useState<number>(0)
  const tRef = useRef<any>(null)
  const notifiedRef = useRef(false)

  // restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem('focusSession')
      if (raw) {
        const s: Session = JSON.parse(raw)
        setSession(s)
      }
    } catch {}
  }, [])

  // tick
  useEffect(() => {
    if (!session) { clearTimer(); setRemaining(0); return }
    startTimer()
    return clearTimer
  }, [session?.startedAt, session?.pausedAt, session?.pausedAccumSec, session?.durationSec])

  function clearTimer() { if (tRef.current) { clearInterval(tRef.current); tRef.current = null } }
  function startTimer() {
    clearTimer()
    tRef.current = setInterval(() => {
      const rem = calcRemaining(session!)
      setRemaining(rem)
      if (rem === 0 && !notifiedRef.current) {
        notifiedRef.current = true
        onTimeUp()
      }
    }, 1000)
    const rem0 = calcRemaining(session!)
    setRemaining(rem0)
    if (rem0 === 0 && !notifiedRef.current) {
      notifiedRef.current = true
      onTimeUp()
    }
  }

  function calcRemaining(s: Session) {
    const now = Date.now()
    const pausedExtra = s.pausedAt ? Math.max(0, Math.floor((now - s.pausedAt) / 1000)) : 0
    const elapsedSec = Math.floor((now - s.startedAt) / 1000) - s.pausedAccumSec - pausedExtra
    return Math.max(0, s.durationSec - elapsedSec)
  }

  function persist(next: Session | null) {
    setSession(next)
    if (next) localStorage.setItem('focusSession', JSON.stringify(next))
    else localStorage.removeItem('focusSession')
    // reset time-up notification when session changes
    notifiedRef.current = false
  }

  async function drawAndStart() {
    try {
      // get tasks (exclude done/archived by default API), then filter out blocked
      const res = await fetch('/api/tasks/list', { cache: 'no-store' })
      if (!res.ok) throw new Error('讀取任務失敗')
      const j = await res.json()
      const pool: Task[] = (j.items || []).filter((t: any) => t.status !== 'blocked')
      if (!pool.length) { show({ message: '目前沒有可用的未完成任務' }); return }
      const pick = pool[Math.floor(Math.random() * pool.length)]
      const s: Session = {
        taskId: pick.id,
        taskTitle: pick.title,
        file_path: pick.file_path,
        project_id: pick.project_id,
        startedAt: Date.now(),
        durationSec: 40 * 60,
        pausedAccumSec: 0,
        rerollUsed: false
      }
      persist(s)
      show({ message: `已開始專注：${pick.title}` })
    } catch (e: any) {
      show({ message: e?.message || '抽卡失敗' })
    }
  }

  async function rerollOnce() {
    if (!session || session.rerollUsed) return
    try {
      const res = await fetch('/api/tasks/list', { cache: 'no-store' })
      if (!res.ok) throw new Error('讀取任務失敗')
      const j = await res.json()
      const pool: Task[] = (j.items || []).filter((t: any) => t.status !== 'blocked' && t.id !== session.taskId)
      if (!pool.length) { show({ message: '沒有其他可抽任務' }); return }
      const pick = pool[Math.floor(Math.random() * pool.length)]
      const s: Session = {
        taskId: pick.id,
        taskTitle: pick.title,
        file_path: pick.file_path,
        project_id: pick.project_id,
        startedAt: Date.now(),
        durationSec: 40 * 60,
        pausedAccumSec: 0,
        rerollUsed: true
      }
      persist(s)
      show({ message: `重新抽取：${pick.title}` })
    } catch (e: any) {
      show({ message: e?.message || '重抽失敗' })
    }
  }

  function pauseResume() {
    if (!session) return
    if (session.pausedAt) {
      // resume
      const now = Date.now()
      const pausedExtra = Math.floor((now - session.pausedAt) / 1000)
      persist({ ...session, pausedAt: undefined, pausedAccumSec: session.pausedAccumSec + pausedExtra })
    } else {
      persist({ ...session, pausedAt: Date.now() })
    }
  }

  function cancel() { persist(null); show({ message: '已取消本次專注' }) }

  async function complete() {
    if (!session) return
    const prev = session
    persist(null)
    try {
      await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: prev.taskId, status: 'done' }) })
      show({ message: `已完成：${prev.taskTitle}`, actionLabel: '撤銷', onAction: async () => {
        await fetch('/api/tasks/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: prev.taskId, status: 'todo' }) })
      } })
    } catch {
      // swallow
    }
  }

  function playBeep() {
    try {
      const ctx = new (window as any).AudioContext()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = 880
      o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      o.start()
      setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2); o.stop(); ctx.close() }, 400)
    } catch {}
  }

  function onTimeUp() {
    playBeep()
    show({ message: `時間到：${session?.taskTitle || ''}`, actionLabel: '延長 5 分鐘', onAction: () => {
      if (!session) return
      persist({ ...session, durationSec: session.durationSec + 300 })
    } })
  }

  // global trigger
  useEffect(() => {
    const onFocus = () => drawAndStart()
    window.addEventListener('open-focus' as any, onFocus)
    return () => window.removeEventListener('open-focus' as any, onFocus)
  }, [])

  if (!session) return null
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  const isPaused = !!session.pausedAt
  return (
    <div className="sticky top-0 z-40 w-full bg-yellow-50/90 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="container py-2 flex items-center justify-between gap-3">
        <div className="text-sm flex items-center gap-3 min-w-0">
          <span className="font-mono text-lg">{mm}:{ss}</span>
          <Link href={{ pathname: `/tasks/${session.taskId}`, query: { path: session.file_path } }} className="truncate hover:underline">{session.taskTitle}</Link>
        </div>
        <div className="flex items-center gap-2">
          {!session.rerollUsed && <button onClick={rerollOnce} className="h-8 px-3 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">重抽一次</button>}
          <button onClick={pauseResume} className="h-8 px-3 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">{isPaused ? '繼續' : '暫停'}</button>
          <button onClick={complete} className="h-8 px-3 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">完成</button>
          <button onClick={cancel} className="h-8 px-3 rounded-md border text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">取消</button>
        </div>
      </div>
    </div>
  )
}
