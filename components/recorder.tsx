"use client"
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'

export default function RecorderModal({ open, onClose, onSaved }: { open: boolean, onClose: () => void, onSaved: (id: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [transcribe, setTranscribe] = useState(true)
  const [error, setError] = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<any>(null)

  useEffect(() => {
    if (!open) {
      cleanup()
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
    fd.append('tags', tags)
    fd.append('wantTranscription', String(transcribe))
    fd.append('durationSec', String(duration))
    try {
      const res = await fetch('/api/capture', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
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
          tags: tags.split(',').map(s => s.trim()).filter(Boolean),
          wantTranscription: transcribe,
          durationSec: duration
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
      <div className="w-full max-w-md rounded-lg bg-white p-4">
        <h2 className="text-lg font-semibold mb-2">Record Idea</h2>
        <div className="space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" className="w-full h-10 rounded-md border px-3" />
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma)" className="w-full h-10 rounded-md border px-3" />
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
