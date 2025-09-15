"use client"
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import ChipsInput from './chips-input'
import { Input } from './ui/input'

export default function RecorderModal({ open, onClose, onSaved }: { open: boolean, onClose: () => void, onSaved: (id: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [transcribe, setTranscribe] = useState(true)
  const [error, setError] = useState('')
  const [importance, setImportance] = useState<number>(3)
  const [status, setStatus] = useState<'draft'|'curating'|'todo'|'done'>('draft')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<any>(null)
  const [projects, setProjects] = useState<Array<{ id: string, title: string }>>([])
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    if (!open) {
      cleanup()
    }
    if (open) {
      // load projects
      ;(async () => {
        try {
          const res = await fetch('/api/projects/list', { cache: 'no-store' })
          if (res.ok) {
            const j = await res.json(); setProjects((j.items || []).map((x: any) => ({ id: x.id, title: x.title })))
          }
        } catch {}
      })()
    }
  }, [open])

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
    setDuration(0)
    chunksRef.current = []
    mediaRef.current?.stream.getTracks().forEach(t => t.stop())
    mediaRef.current = null
  }

  async function start() {
    setError('')
    try {
      const constraints: MediaStreamConstraints = { audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const mime = pickMime()
      const mr = new MediaRecorder(stream, { mimeType: mime })
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = onStop
      mr.start()
      setRecording(true)
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch (e: any) {
      setError(e?.message || 'Microphone permission denied')
    }
  }

  function stop() {
    mediaRef.current?.stop()
  }

  async function onStop() {
    if (timerRef.current) clearInterval(timerRef.current)
    const mime = mediaRef.current?.mimeType || pickMime()
    const blob = new Blob(chunksRef.current, { type: mime })
    const fd = new FormData()
    fd.append('audio', blob, 'audio')
    fd.append('title', title)
    fd.append('tags', tags.join(','))
    fd.append('wantTranscription', String(transcribe))
    fd.append('durationSec', String(duration))
    fd.append('importance', String(importance))
    fd.append('status', status)
    if (projectId) fd.append('project_id', projectId)
    try {
      const res = await fetch('/api/capture', { method: 'POST', body: fd })
      if (!res.ok) {
        let msg = `Upload failed (${res.status})`
        try { const j = await res.json(); if (j?.error) msg = j.error } catch {}
        throw new Error(msg)
      }
      const j = await res.json()
      onSaved(j.id)
      onClose()
    } catch (e: any) {
      // queue locally
      try {
        const arr: any[] = JSON.parse(localStorage.getItem('ideaQueue') || '[]')
        const arrayBuffer = await blob.arrayBuffer()
        arr.push({
          audio: { data: Array.from(new Uint8Array(arrayBuffer)), type: blob.type },
          title,
          tags: tags,
          wantTranscription: transcribe,
          durationSec: duration,
          importance,
          status
        })
        localStorage.setItem('ideaQueue', JSON.stringify(arr))
      } catch {}
      setError(e?.message || 'Failed to save, queued locally')
    } finally {
      cleanup()
    }
  }

  function pickMime() {
    const preferred = [
      'audio/mp4', // iOS
      'audio/webm;codecs=opus',
      'audio/webm'
    ]
    for (const m of preferred) {
      if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m
    }
    return 'audio/webm'
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 p-4">
        <h2 className="text-lg font-semibold mb-2">Record Idea</h2>
        <div className="space-y-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" />
          <ChipsInput value={tags} onChange={setTags} placeholder="新增標籤，Enter/逗號確定" />
          <div className="flex gap-2 items-center">
            <label className="text-sm">重要性</label>
            <input type="number" min={1} max={5} value={importance} onChange={e => setImportance(Number(e.target.value))} className="h-10 rounded-md border px-3 text-sm w-24 dark:bg-gray-900 dark:border-gray-700" />
            <label className="text-sm">狀態</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700">
              <option value="draft">草稿</option>
              <option value="curating">整理中</option>
              <option value="todo">待辦</option>
              <option value="done">完成</option>
            </select>
          </div>
          <label className="text-sm">專案</label>
          <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="h-10 rounded-md border px-3 text-sm dark:bg-gray-900 dark:border-gray-700">
            <option value="">未指定</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={transcribe} onChange={e => setTranscribe(e.target.checked)} /> Transcribe</label>
          <div className="text-sm text-gray-600">Duration: {duration}s</div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <div className="flex gap-2 justify-end">
            {!recording && <Button onClick={start}>Start</Button>}
            {recording && <Button onClick={stop}>Stop</Button>}
            <Button variant="ghost" onClick={() => { cleanup(); onClose() }}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
