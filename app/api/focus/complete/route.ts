import { NextRequest, NextResponse } from 'next/server'
import { commitFiles, getContent } from '@/lib/github'

function ymdLocal(dateIso: string | number) {
  const d = new Date(dateIso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export async function POST(req: NextRequest) {
  try {
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (!hasGitHub) return NextResponse.json({ ok: false, skipped: true, reason: 'missing github env' })

    const body = await req.json()
    const started_at: string = body.started_at
    const ended_at: string = body.ended_at
    const seconds: number = Number(body.seconds || 0)
    const task_id: string = String(body.task_id || '')
    const task_title: string = String(body.task_title || '')
    const date: string = String(body.date || '') || ymdLocal(ended_at || Date.now())
    const valid_threshold = 20 * 60
    const valid = seconds >= valid_threshold

    const ym = date.slice(0, 7) // YYYY-MM
    const path = `game/focus/${ym}.jsonl`
    let prev = ''
    try {
      const existing = await getContent(path)
      prev = existing || ''
    } catch {}
    const record = {
      date,
      started_at,
      ended_at,
      seconds,
      task_id,
      task_title,
      mode: 'focus',
      completed: true,
      valid_threshold_sec: valid_threshold,
      valid
    }
    const next = prev ? `${prev}\n${JSON.stringify(record)}` : JSON.stringify(record)
    await commitFiles({ message: `chore(focus): log ${date} ${task_title || task_id}`, files: [{ path, content: next }] })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

