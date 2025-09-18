import { NextRequest, NextResponse } from 'next/server'
import { readTasksIndex } from '@/lib/github'
import { devTasksList } from '@/lib/devTasks'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id') || ''
    const todayParam = (searchParams.get('today') || '').trim() // expect YYYY-MM-DD from client local day
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
      const todayStr = todayParam || (() => { const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}` })()
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
      if (completedOnly) {
        list = list.filter(t => {
          const s = (t.completed_at || '').slice(0,10)
          if (!s) return false
          const geFrom = from ? s >= from : true
          const leTo = to ? s <= to : true
          return geFrom && leTo
        })
      } else {
        list = list.filter(t => {
          if (!t.due_date) return false
          const s = String(t.due_date).slice(0,10)
          const geFrom = from ? s >= from : true
          const leTo = to ? s <= to : true
          return geFrom && leTo
        })
      }
    }
    // attach effective daily status for client rendering
    const todayStr = todayParam || (() => { const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}` })()
    const withEffective = list.map(t => {
      let effective_status = t.status
      let effective_completed_today = false
      if (t.recurring === 'daily') {
        const ca = (t as any).completed_at as string | undefined
        if (ca && ca.startsWith(todayStr)) { effective_status = 'done'; effective_completed_today = true }
        else { effective_status = 'todo' }
      }
      return { ...t, effective_status, effective_completed_today }
    })
    // sort by position asc, then priority desc, then updated desc
    withEffective.sort((a: any, b: any) => (a.position - b.position) || (b.priority - a.priority) || b.updated_at.localeCompare(a.updated_at))
    return NextResponse.json({ items: withEffective })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
