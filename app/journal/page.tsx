"use client"
import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast'

function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const EMPTY_SECTIONS = {
  accomplishment: '',
  gratitude: '',
  insight: '',
  reflection: '',
  focus: ''
}

export default function JournalPage() {
  const [date, setDate] = useState(todayLocal)
  const [sections, setSections] = useState(EMPTY_SECTIONS)
  const [createdAt, setCreatedAt] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { show } = useToast()

  useEffect(() => {
    let ignore = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/journal/get?date=${date}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('failed')
        const json = await res.json()
        if (!ignore) {
          setSections(json.entry.sections || EMPTY_SECTIONS)
          setCreatedAt(json.entry.created_at || '')
          setUpdatedAt(json.entry.updated_at || '')
        }
      } catch {
        if (!ignore) {
          setSections(EMPTY_SECTIONS)
          setCreatedAt('')
          setUpdatedAt('')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [date])

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/journal/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...sections })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || '儲存失敗')
      setUpdatedAt(new Date().toISOString())
      show({ message: json?.xp?.skipped ? '日記已更新' : '日記已儲存＋10 XP' })
    } catch (e: any) {
      show({ message: e?.message || '儲存失敗', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const headerSubtitle = useMemo(() => {
    if (loading) return '載入中…'
    if (!updatedAt) return '尚未撰寫'
    try {
      return `最後更新：${new Date(updatedAt).toLocaleString()}`
    } catch {
      return ''
    }
  }, [loading, updatedAt])

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">日記</h1>
          <div className="text-xs text-gray-500 dark:text-gray-400">{headerSubtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 w-40" />
          <Button onClick={save} disabled={saving}>{saving ? '儲存中…' : '儲存日記'}</Button>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">成果與感謝</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">為今天劃下肯定句點，肯定自己的進步與感謝。</p>
          <label className="block text-sm font-medium mt-3">今日成就</label>
          <Textarea value={sections.accomplishment} onChange={e => setSections(s => ({ ...s, accomplishment: e.target.value }))} rows={3} />
          <label className="block text-sm font-medium mt-3">今日感謝</label>
          <Textarea value={sections.gratitude} onChange={e => setSections(s => ({ ...s, gratitude: e.target.value }))} rows={3} />
        </div>

        <div>
          <h2 className="text-lg font-semibold">學習與洞察</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">提煉今天的智慧，累積未來創作與反思素材。</p>
          <label className="block text-sm font-medium mt-3">今日洞察</label>
          <Textarea value={sections.insight} onChange={e => setSections(s => ({ ...s, insight: e.target.value }))} rows={3} />
          <label className="block text-sm font-medium mt-3">自我反思</label>
          <Textarea value={sections.reflection} onChange={e => setSections(s => ({ ...s, reflection: e.target.value }))} rows={3} />
        </div>

        <div>
          <h2 className="text-lg font-semibold">明日的準備</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">為明天預先設定清晰焦點，降低開始時的阻力。</p>
          <label className="block text-sm font-medium mt-3">明日焦點</label>
          <Textarea value={sections.focus} onChange={e => setSections(s => ({ ...s, focus: e.target.value }))} rows={3} />
        </div>
      </section>
    </div>
  )
}
