import { NextRequest, NextResponse } from 'next/server'
import { readTasksIndex } from '@/lib/github'
import { devTasksList } from '@/lib/devTasks'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id') || ''
    const from = searchParams.get('from') || '' // YYYY-MM-DD
    const to = searchParams.get('to') || ''     // YYYY-MM-DD
    const status = searchParams.get('status') || ''
    const tag = searchParams.get('tag') || ''
    const includeDone = (searchParams.get('include_done') || 'false') === 'true'
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    let list = hasGitHub ? await readTasksIndex() : devTasksList()
    if (projectId) list = list.filter(t => t.project_id === projectId)
    if (status) list = list.filter(t => t.status === status)
    if (tag) list = list.filter(t => (t.tags||[]).includes(tag))
    if (!includeDone) list = list.filter(t => t.status !== 'done' && t.status !== 'archived')
    if (from || to) {
      const fromTime = from ? Date.parse(from) : Number.NEGATIVE_INFINITY
      const toTime = to ? Date.parse(to) : Number.POSITIVE_INFINITY
      list = list.filter(t => {
        if (!t.due_date) return false
        const d = Date.parse(t.due_date)
        return d >= fromTime && d <= toTime
      })
    }
    // sort by position asc, then priority desc, then updated desc
    list.sort((a, b) => (a.position - b.position) || (b.priority - a.priority) || b.updated_at.localeCompare(a.updated_at))
    return NextResponse.json({ items: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
