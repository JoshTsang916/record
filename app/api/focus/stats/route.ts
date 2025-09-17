import { NextRequest, NextResponse } from 'next/server'
import { getContent } from '@/lib/github'

function ymdLocal(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}

function weekRange(d: Date) {
  const day = d.getDay() // 0 Sun
  const diffToMon = (day + 6) % 7
  const start = new Date(d); start.setDate(d.getDate() - diffToMon); start.setHours(0,0,0,0)
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999)
  return { start, end }
}

async function readMonth(ym: string) {
  try {
    const content = await getContent(`game/focus/${ym}.jsonl`)
    if (!content) return [] as any[]
    return content.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
  } catch { return [] as any[] }
}

export async function GET(req: NextRequest) {
  try {
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (!hasGitHub) return NextResponse.json({ streak: 0, best: 0, week_count: 0, week_minutes: 0 })

    const today = new Date()
    const { start, end } = weekRange(today)
    const neededMonths = new Set<string>()
    // cover 90 days for streak + current week
    for (let i=0;i<90;i++) {
      const d = new Date(today); d.setDate(today.getDate()-i)
      neededMonths.add(d.toISOString().slice(0,7))
    }
    const months = Array.from(neededMonths.values())
    const events: any[] = []
    for (const ym of months) events.push(...await readMonth(ym))

    const validEvents = events.filter(e => e.mode==='focus' && e.valid)
    const byDate = new Map<string, any[]>()
    for (const e of validEvents) {
      const d = e.date || ymdLocal(new Date(e.ended_at))
      if (!byDate.has(d)) byDate.set(d, [])
      byDate.get(d)!.push(e)
    }
    // streak: consecutive days ending today
    let streak = 0
    for (let i=0;i<90;i++) {
      const d = new Date(today); d.setDate(today.getDate()-i)
      const k = ymdLocal(d)
      if (byDate.has(k)) streak++
      else break
    }
    // best streak (scan 90 days)
    let best = 0, cur = 0
    for (let i=90;i>=0;i--) {
      const d = new Date(today); d.setDate(today.getDate()-i)
      const k = ymdLocal(d)
      if (byDate.has(k)) { cur++; best = Math.max(best, cur) } else { cur = 0 }
    }
    // week stats
    const week_count = validEvents.filter(e => {
      const t = new Date(e.ended_at)
      return t >= start && t <= end
    }).length
    const week_minutes = Math.round(validEvents.filter(e => {
      const t = new Date(e.ended_at)
      return t >= start && t <= end
    }).reduce((sum, e) => sum + (Number(e.seconds)||0), 0) / 60)

    return NextResponse.json({ streak, best, week_count, week_minutes })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

