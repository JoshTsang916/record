import { NextRequest, NextResponse } from 'next/server'
import { getContent } from '@/lib/github'

function parseDate(str: string) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

async function readMonth(ym: string) {
  try {
    const body = await getContent(`game/xp/${ym}.jsonl`)
    if (!body) return []
    return body.split(/\r?\n/).filter(Boolean).map((line: string) => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean)
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  try {
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (!hasGitHub) return NextResponse.json({ items: [] })
    const { searchParams } = new URL(req.url)
    const fromStr = (searchParams.get('from') || '').trim()
    const toStr = (searchParams.get('to') || '').trim()
    const sourcesParam = (searchParams.get('source') || '').trim()
    const allowSources = sourcesParam ? sourcesParam.split(',').map(s => s.trim()).filter(Boolean) : []
    const fromDate = parseDate(fromStr ? `${fromStr}T00:00:00` : '')
    const toDate = parseDate(toStr ? `${toStr}T23:59:59` : '')
    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'from/to required (YYYY-MM-DD)' }, { status: 400 })
    }

    const months = new Set<string>()
    const cursor = new Date(fromDate)
    cursor.setDate(1)
    while (cursor <= toDate) {
      months.add(cursor.toISOString().slice(0,7))
      cursor.setMonth(cursor.getMonth() + 1)
    }

    const items: any[] = []
    for (const ym of months) {
      const arr = await readMonth(ym)
      for (const entry of arr) {
        const dateStr = typeof entry?.date === 'string' ? entry.date : ''
        if (!dateStr) continue
        const ts = parseDate(`${dateStr}T00:00:00`)
        if (!ts) continue
        if (ts < fromDate || ts > toDate) continue
        if (allowSources.length > 0) {
          const source = typeof entry?.source === 'string' ? entry.source : ''
          if (!allowSources.includes(source)) continue
        }
        items.push({
          date: dateStr,
          ts: entry?.ts || `${dateStr}T00:00:00.000Z`,
          xp: Number(entry?.xp) || 0,
          minutes: Number(entry?.minutes) || Number(entry?.xp) || 0,
          source: entry?.source || '',
          task_id: entry?.task_id || '',
          task_title: entry?.task_title || '',
          project_id: entry?.project_id || '',
          attributes: Array.isArray(entry?.attributes) ? entry.attributes : [],
          idempotency_key: entry?.idempotency_key || ''
        })
      }
    }
    items.sort((a, b) => (a.date === b.date ? (a.task_title || '').localeCompare(b.task_title || '') : a.date.localeCompare(b.date)))
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
