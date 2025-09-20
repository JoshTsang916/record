import { NextRequest, NextResponse } from 'next/server'
import { commitFiles, readJournalFileByPath, readJournalIndex, readProjectsIndex } from '@/lib/github'
import { journalMdPath, JOURNAL_INDEX_PATH } from '@/lib/id'
import { serializeJournal } from '@/lib/markdown'
import type { JournalFrontmatter, JournalIndexRecord } from '@/lib/types'

function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildContent(sections: JournalFrontmatter['sections']) {
  return [
    '## 成果與感謝 (Accomplishments & Gratitude)',
    '### 今日成就',
    sections.accomplishment || '',
    '',
    '### 今日感謝',
    sections.gratitude || '',
    '',
    '## 學習與洞察 (Learning & Insight)',
    '### 今日洞察',
    sections.insight || '',
    '',
    '### 自我反思',
    sections.reflection || '',
    '',
    '## 明日的準備 (Preparation for Tomorrow)',
    '### 明日焦點',
    sections.focus || ''
  ].join('\n')
}

async function ensureProjectSelfGrowth(): Promise<string> {
  try {
    const projects = await readProjectsIndex()
    const found = projects.find(p => p.title === '自我成長')
    return found?.id || ''
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (!hasGitHub) return NextResponse.json({ error: 'missing github env' }, { status: 400 })

    const body = await req.json()
    const date = (body.date || todayLocal()).trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 })
    const sections = {
      accomplishment: String(body.accomplishment || ''),
      gratitude: String(body.gratitude || ''),
      insight: String(body.insight || ''),
      reflection: String(body.reflection || ''),
      focus: String(body.focus || '')
    }
    const path = journalMdPath(date)
    const nowIso = new Date().toISOString()

    let createdAt = nowIso
    try {
      const existing = await readJournalFileByPath(path)
      createdAt = existing.frontmatter.created_at || nowIso
    } catch {}

    const frontmatter: JournalFrontmatter = {
      date,
      created_at: createdAt,
      updated_at: nowIso,
      sections
    }
    const md = serializeJournal({ frontmatter, content: buildContent(sections) })

    const index = await readJournalIndex()
    const record: JournalIndexRecord = { date, updated_at: nowIso, file_path: path }
    const nextIndex = [record, ...index.filter(x => x.date !== date)].sort((a, b) => b.date.localeCompare(a.date))

    await commitFiles({
      message: `feat(journal): save ${date}`,
      files: [
        { path, content: md },
        { path: JOURNAL_INDEX_PATH, content: JSON.stringify(nextIndex, null, 2) }
      ]
    })

    const projectId = await ensureProjectSelfGrowth()
    const xpUrl = new URL('/api/xp/award', req.url)
    const xpRes = await fetch(xpUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'journal',
        task_id: `journal-${date}`,
        task_title: `日記 ${date}`,
        project_id: projectId,
        minutes: 10,
        date,
        attributes: ['C','R','T','EV']
      })
    }).catch(() => null)
    let xpResult: any = { ok: false }
    if (xpRes) {
      try { xpResult = await xpRes.json() } catch {}
    }

    return NextResponse.json({ ok: true, xp: xpResult })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
