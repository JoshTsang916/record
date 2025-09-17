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
  const [mode, setMode] = useState<'hidden'|'drawing'|'countdown'|'running'>('hidden')
  const [displayTitle, setDisplayTitle] = useState<string>('')
  const [winner, setWinner] = useState<Task | null>(null)
  const [count3, setCount3] = useState<number>(3)
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
    setMode(next ? 'running' : 'hidden')
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
      setWinner(pick)
      // prepare carousel sequence (ease-out): durations increasing
      setMode('drawing')
      const steps = 18
      const base = 70
      const inc = 25
      let i = 0
      const runStep = () => {
        if (i < steps - 1) {
          const next = pool[Math.floor(Math.random() * pool.length)].title
          setDisplayTitle(next)
          const delay = base + inc * Math.pow(i / (steps - 1), 2)
          i++
          setTimeout(runStep, delay)
        } else {
          // final reveal is winner
          setDisplayTitle(pick.title)
          // short pause then countdown
          setTimeout(() => {
            setMode('countdown')
            setCount3(3)
            startCountdown(pick)
          }, 400)
        }
      }
      runStep()
    } catch (e: any) {
      show({ message: e?.message || '抽卡失敗' })
    }
  }

  function startCountdown(task: Task) {
    let n = 3
    setCount3(n)
    const iv = setInterval(() => {
      n -= 1
      if (n <= 0) {
        clearInterval(iv)
        // start session
        const s: Session = {
          taskId: task.id,
          taskTitle: task.title,
          file_path: task.file_path,
          project_id: task.project_id,
          startedAt: Date.now(),
          durationSec: 40 * 60,
          pausedAccumSec: 0,
          rerollUsed: false
        }
        persist(s)
        show({ message: `已開始專注：${task.title}` })
      } else {
        setCount3(n)
      }
    }, 1000)
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

  // lock scroll when overlay visible
  useEffect(() => {
    const visible = session || mode !== 'hidden'
    if (visible) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [session, mode])

  const overlayVisible = !!session || mode !== 'hidden'
  if (!overlayVisible) return null
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  const isPaused = !!session?.pausedAt
  const percent = session ? Math.round(((session.durationSec - remaining) / session.durationSec) * 100) : 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div role="dialog" aria-modal="true" className="w-full max-w-2xl mx-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center gap-4">
        {mode==='drawing' && (
          <>
            <div className="text-sm text-gray-500 dark:text-gray-400">抽選中…</div>
            <div className="text-2xl sm:text-3xl font-medium text-center max-w-full break-words whitespace-pre-wrap animate-pulse">
              {displayTitle}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => { if (winner) { setMode('countdown'); setCount3(3); startCountdown(winner) } }} className="h-10 px-4 rounded-md border text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">跳過儀式</button>
            </div>
          </>
        )}
        {mode==='countdown' && (
          <>
            <div className="text-sm text-gray-500 dark:text-gray-400">準備開始</div>
            <div className="text-7xl font-mono">{count3}</div>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => { if (winner) { startCountdown(winner) } }} className="h-10 px-4 rounded-md border text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">重新倒數</button>
              <button onClick={() => { if (winner) { // 直接開始
                const s: Session = { taskId: winner.id, taskTitle: winner.title, file_path: winner.file_path, project_id: winner.project_id, startedAt: Date.now(), durationSec: 40*60, pausedAccumSec: 0, rerollUsed: false }
                persist(s)
                show({ message: `已開始專注：${winner.title}` })
              } }} className="h-10 px-4 rounded-md border text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">跳過倒數</button>
            </div>
          </>
        )}
        {session && mode==='running' && (
        <div className="w-full">
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 dark:bg-yellow-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="text-6xl font-mono tabular-nums">{mm}:{ss}</div>
        <Link href={{ pathname: `/tasks/${session.taskId}`, query: { path: session.file_path } }} className="text-center text-lg font-medium hover:underline max-w-full truncate">
          {session.taskTitle}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          {!session.rerollUsed && (
            <button onClick={rerollOnce} className="h-10 px-4 rounded-md border text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">重抽一次</button>
          )}
          <button onClick={pauseResume} className="h-10 px-4 rounded-md border text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">{isPaused ? '繼續' : '暫停'}</button>
          <button onClick={complete} className="h-10 px-4 rounded-md border text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">完成</button>
          <button onClick={cancel} className="h-10 px-4 rounded-md border text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">取消</button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          專注進行中。切換頁面前請先完成或取消。
        </div>
        )}
      </div>
    </div>
  )
}
