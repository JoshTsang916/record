"use client"
import Link from 'next/link'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useEffect, useState } from 'react'

export default function Navbar({ onRecordClick, onNewText }: { onRecordClick?: () => void, onNewText?: () => void }) {
  const [queued, setQueued] = useState<number>(0)

  useEffect(() => {
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

  return (
    <nav className="w-full border-b border-gray-200">
      <div className="container h-14 flex items-center justify-between gap-3">
        <Link href="/" className="font-semibold">Idea Vault</Link>
        <div className="flex items-center gap-2">
          <Input placeholder="Search" className="hidden sm:block w-64" onChange={() => {}} />
          <Button variant="outline" onClick={onNewText}>New (text)</Button>
          <Button onClick={onRecordClick}>Record</Button>
          <Button variant="ghost" onClick={retryQueue}>Retry{queued ? ` (${queued})` : ''}</Button>
        </div>
      </div>
    </nav>
  )
}

