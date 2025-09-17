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
    const completedOnly = (searchParams.get('completed_only') || 'false') === 'true'
    const noDateOnly = (searchParams.get('nodate') || 'false') === 'true'
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    let list = hasGitHub ? await readTasksIndex() : devTasksList()

    // no auto-seed here; daily tasks are created once and cycle by completed_at
    if (projectId) list = list.filter(t => t.project_id === projectId)
    if (status) list = list.filter(t => t.status === status)
    if (tag) list = list.filter(t => (t.tags||[]).includes(tag))
    if (!includeDone && !completedOnly) {
      const today = new Date(); const y = today.getUTCFullYear(); const m = String(today.getUTCMonth()+1).padStart(2,'0'); const d = String(today.getUTCDate()).padStart(2,'0');
      const todayStr = `${y}-${m}-${d}`
      list = list.filter(t => {
        if (t.status === 'archived') return false
        if (t.status !== 'done') return true
        // allow recurring daily tasks if not completed today
        if (t.recurring === 'daily') {
          const ca = (t as any).completed_at as string | undefined
          if (!ca) return true
          return !ca.startsWith(todayStr)
        }
        return false
      })
    }
    if (noDateOnly && !completedOnly) {
      list = list.filter(t => !t.due_date)
    } else if (from || to) {
      const fromTime = from ? Date.parse(from) : Number.NEGATIVE_INFINITY
      const toTime = to ? Date.parse(to) : Number.POSITIVE_INFINITY
      if (completedOnly) {
        list = list.filter(t => {
          if (!t.completed_at) return false
          const d = Date.parse(t.completed_at)
          return d >= fromTime && d <= toTime
        })
      } else {
        list = list.filter(t => {
          if (!t.due_date) return false
          const d = Date.parse(t.due_date)
          return d >= fromTime && d <= toTime
        })
      }
    }
    // sort by position asc, then priority desc, then updated desc
    list.sort((a, b) => (a.position - b.position) || (b.priority - a.priority) || b.updated_at.localeCompare(a.updated_at))
    return NextResponse.json({ items: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
