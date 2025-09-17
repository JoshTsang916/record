import { NextRequest, NextResponse } from 'next/server'
import { readTasksIndex, readProjectsIndex, commitFiles } from '@/lib/github'
import { taskId, taskMdPath, TASKS_INDEX_PATH } from '@/lib/id'
import { serializeTask } from '@/lib/markdown'
import type { TaskFrontmatter, TaskIndexRecord } from '@/lib/types'
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

    // one-time auto-seed missing daily tasks under project "自我成長"
    if (hasGitHub) {
      try {
        const projects = await readProjectsIndex()
        const growth = projects.find(p => p.title === '自我成長')
        if (growth) {
          const needTitles = ['深度閱讀','無壓力寫作','腦力激盪','AI 技術探索']
          const missing = needTitles.filter(t => !list.some(x => x.title === t && x.project_id === growth.id))
          if (missing.length > 0) {
            const nowIso = new Date().toISOString()
            const files: Array<{ path: string, content: string }> = []
            let nextList = [...list]
            for (const title of missing) {
              const id = taskId()
              const path = taskMdPath(id, nowIso)
              const fm: TaskFrontmatter = {
                id,
                project_id: growth.id,
                title,
                description: '',
                created_at: nowIso,
                updated_at: nowIso,
                status: 'todo',
                priority: 3,
                tags: [],
                due_date: undefined,
                completed_at: undefined,
                recurring: 'daily',
                estimate: undefined,
                assignee: undefined,
                position: Date.now(),
                relations: { links: [] }
              }
              const md = serializeTask({ frontmatter: fm, content: '' })
              const rec: TaskIndexRecord = { id, project_id: growth.id, title: fm.title, status: fm.status, priority: fm.priority, position: fm.position, tags: fm.tags, created_at: fm.created_at, updated_at: fm.updated_at, due_date: fm.due_date, completed_at: fm.completed_at, recurring: fm.recurring, file_path: path }
              files.push({ path, content: md })
              nextList = [rec, ...nextList]
            }
            files.push({ path: TASKS_INDEX_PATH, content: JSON.stringify(nextList, null, 2) })
            await commitFiles({ message: 'feat(seed): auto add missing daily tasks under 自我成長', files })
            list = nextList
          }
        }
      } catch (e) {
        // swallow seed errors; listing should continue
      }
    }
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
