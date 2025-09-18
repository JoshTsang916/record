"use client"
import Link from 'next/link'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useCallback, useEffect, useState } from 'react'

export default function Navbar({ onRecordClick, onNewText }: { onRecordClick?: () => void, onNewText?: () => void }) {
  const [queued, setQueued] = useState<number>(0)
  const [dark, setDark] = useState(false)
  const [streak, setStreak] = useState<{ streak: number, week_count: number, week_minutes: number }>({ streak: 0, week_count: 0, week_minutes: 0 })
  const [openPanel, setOpenPanel] = useState(false)
  const [level, setLevel] = useState<{ level: number, progress: number }>({ level: 1, progress: 0 })

  useEffect(() => {
    // theme init
    const pref = localStorage.getItem('theme')
    const isDark = pref ? pref === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)

    const refresh = () => {
      try {
        const q = JSON.parse(localStorage.getItem('ideaQueue') || '[]')
        setQueued(Array.isArray(q) ? q.length : 0)
      } catch { setQueued(0) }
    }
    refresh()
    const id = setInterval(refresh, 2000)
    return () => clearInterval(id)
  }, [])

  const refreshXp = useCallback(async () => {
    try {
      const xp = await fetch('/api/xp/stats/profile', { cache: 'no-store' })
      if (xp.ok) {
        const j = await xp.json()
        setLevel({ level: j.level || 1, progress: j.progress || 0 })
      }
    } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/focus/stats', { cache: 'no-store' })
        if (res.ok) {
          const j = await res.json(); setStreak({ streak: j.streak||0, week_count: j.week_count||0, week_minutes: j.week_minutes||0 })
        }
      } catch {}
      await refreshXp()
    })()
  }, [refreshXp])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => { refreshXp() }
    window.addEventListener('xp-updated', handler)
    return () => { window.removeEventListener('xp-updated', handler) }
  }, [refreshXp])

  async function retryQueue() {
    try {
      const q: any[] = JSON.parse(localStorage.getItem('ideaQueue') || '[]')
      const rest: any[] = []
      for (const item of q) {
        const fd = new FormData()
        if (item.audio) fd.append('audio', new Blob([new Uint8Array(item.audio.data)], { type: item.audio.type }), 'audio')
        fd.append('title', item.title || '')
        fd.append('tags', (item.tags || []).join(','))
        fd.append('wantTranscription', String(item.wantTranscription !== false))
        fd.append('durationSec', String(item.durationSec || 0))
        if (item.text) fd.append('text', item.text)
        const res = await fetch('/api/capture', { method: 'POST', body: fd })
        if (!res.ok) rest.push(item)
      }
      localStorage.setItem('ideaQueue', JSON.stringify(rest))
      setQueued(rest.length)
    } catch {}
  }

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <nav className="w-full border-b border-gray-200 dark:border-gray-800">
      <div className="container py-2 sm:h-14 sm:py-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* 第一行：品牌（手機置頂） */}
        <Link href="/" className="font-semibold">Idea Vault</Link>

        {/* 手機：分三行群組；桌機：同一行靠右 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* 第二行（手機）：新增/錄音/重試 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => { if (onNewText) onNewText(); else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-new-text')) }}>New (text)</Button>
            <Button onClick={() => { if (onRecordClick) onRecordClick(); else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-record')) }}>Record</Button>
            <Button onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-focus')) }}>專注</Button>
          </div>
          {/* 第三行（手機）：導航 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/board"><Button variant="outline">看板</Button></Link>
            <Link href="/calendar"><Button variant="outline">日曆</Button></Link>
            <Link href="/projects"><Button variant="outline">專案</Button></Link>
            <Link href="/growth"><Button variant="outline">成長</Button></Link>
          </div>
          {/* 第四行（手機）：等級/火焰/主題 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs">Lv {level.level}</span>
              <div className="w-20 sm:w-24 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${Math.round(level.progress*100)}%` }} /></div>
              <span className="text-xs">{Math.round(level.progress*100)}%</span>
            </div>
            <button className="relative h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 text-sm" onClick={()=>setOpenPanel(v=>!v)} title="連續專注">
              🔥 {streak.streak}
            </button>
            <Button variant="ghost" aria-label={dark ? '切換為亮色' : '切換為夜間'} onClick={toggleTheme}>{dark ? '🌞' : '🌙'}</Button>
          </div>
        </div>
        {openPanel && (
          <div className="absolute right-2 top-12 z-50 w-64 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-sm shadow">
            <div className="font-medium mb-2">專注統計</div>
            <div className="flex items-center justify-between"><span>連續天數</span><span className="font-mono">{streak.streak} 天</span></div>
            <div className="flex items-center justify-between"><span>本週次數</span><span className="font-mono">{streak.week_count}</span></div>
            <div className="flex items-center justify-between"><span>本週分鐘</span><span className="font-mono">{streak.week_minutes}</span></div>
          </div>
        )}
      </div>
    </nav>
  )
}
