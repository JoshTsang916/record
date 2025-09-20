import { NextRequest, NextResponse } from 'next/server'
import { readJournalIndex, readJournalFileByPath } from '@/lib/github'
import { journalMdPath } from '@/lib/id'

function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = (searchParams.get('date') || todayLocal()).trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 })
    }
    const path = journalMdPath(date)
    try {
      const file = await readJournalFileByPath(path)
      return NextResponse.json({ ok: true, entry: {
        date: file.frontmatter.date,
        created_at: file.frontmatter.created_at,
        updated_at: file.frontmatter.updated_at,
        sections: file.frontmatter.sections
      } })
    } catch {
      const index = await readJournalIndex()
      const existing = index.find(x => x.date === date)
      return NextResponse.json({ ok: true, entry: {
        date,
        created_at: existing?.updated_at || '',
        updated_at: existing?.updated_at || '',
        sections: {
          accomplishment: '',
          gratitude: '',
          insight: '',
          reflection: '',
          focus: ''
        }
      } })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
