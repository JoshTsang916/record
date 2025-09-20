import { NextResponse } from 'next/server'
import { readJournalIndex } from '@/lib/github'

function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(date: Date, delta: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + delta)
  return d
}

function toKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET() {
  try {
    const list = await readJournalIndex()
    const dates = new Set(list.map(item => item.date))
    const today = todayLocal()
    let streak = 0
    let cursor = new Date()
    while (true) {
      const key = toKey(cursor)
      if (dates.has(key)) {
        streak += 1
        cursor = addDays(cursor, -1)
      } else {
        break
      }
    }
    const highlight = streak >= 5
    return NextResponse.json({ ok: true, streak, has_today: dates.has(today), highlight })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
