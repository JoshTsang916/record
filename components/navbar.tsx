"use client"
import Link from 'next/link'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useEffect, useState } from 'react'

export default function Navbar({ onRecordClick, onNewText }: { onRecordClick?: () => void, onNewText?: () => void }) {
  const [queued, setQueued] = useState<number>(0)
  const [dark, setDark] = useState(false)

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

        {/* 手機：分兩行群組；桌機：同一行靠右 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* 第二行（手機）：新增/錄音/重試 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => { if (onNewText) onNewText(); else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-new-text')) }}>New (text)</Button>
            <Button onClick={() => { if (onRecordClick) onRecordClick(); else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-record')) }}>Record</Button>
            <Button onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-focus')) }}>專注</Button>
            <Button variant="ghost" onClick={retryQueue}>Retry{queued ? ` (${queued})` : ''}</Button>
          </div>
          {/* 第三行（手機）：看板與主題切換 */}
          <div className="flex items-center gap-2">
            <Link href="/board"><Button variant="outline">看板</Button></Link>
            <Link href="/calendar"><Button variant="outline">日曆</Button></Link>
            <Link href="/projects"><Button variant="outline">專案</Button></Link>
            <Button variant="ghost" onClick={toggleTheme}>{dark ? '亮色' : '夜間'}</Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
