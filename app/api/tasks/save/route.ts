import { NextRequest, NextResponse } from 'next/server'
import { readTasksIndex, readTaskFileByPath, commitFiles } from '@/lib/github'
import { serializeTask } from '@/lib/markdown'
import { TASKS_INDEX_PATH } from '@/lib/id'
import { devTasksList, devTasksRead, devTasksUpdate } from '@/lib/devTasks'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, title, description, status, priority, tags, content, position, project_id, due_date, completed_at, recurring, focus_exclude, estimate, assignee } = body || {}
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    const list = hasGitHub ? await readTasksIndex() : devTasksList()
    const item = list.find(x => x.id === id)
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const file = hasGitHub ? await readTaskFileByPath(item.file_path) : (devTasksRead(item.file_path)!)
    const nowIso = new Date().toISOString()
    const prevStatus = file.frontmatter.status
    if (typeof title === 'string') file.frontmatter.title = title
    if (typeof description === 'string') file.frontmatter.description = description
    if (typeof status === 'string') file.frontmatter.status = status as any
    if (typeof priority === 'number') file.frontmatter.priority = priority
    if (Array.isArray(tags)) file.frontmatter.tags = tags
    if (typeof position === 'number') file.frontmatter.position = position
    if (typeof project_id === 'string') file.frontmatter.project_id = project_id
    if (typeof due_date === 'string') file.frontmatter.due_date = due_date
    if (typeof recurring === 'string') file.frontmatter.recurring = recurring === 'daily' ? 'daily' : undefined
    const isDaily = file.frontmatter.recurring === 'daily'
    const nextStatus = file.frontmatter.status
    if (typeof completed_at === 'string') file.frontmatter.completed_at = completed_at
    else if (nextStatus === 'done') {
      if (isDaily) {
        file.frontmatter.completed_at = nowIso
      } else if (prevStatus !== 'done' || !file.frontmatter.completed_at) {
        file.frontmatter.completed_at = nowIso
      }
    } else if (isDaily) {
      file.frontmatter.completed_at = undefined
    }
    if (typeof focus_exclude === 'boolean') file.frontmatter.focus_exclude = focus_exclude
    if (typeof estimate === 'number') file.frontmatter.estimate = estimate
    if (typeof assignee === 'string') file.frontmatter.assignee = assignee
    file.frontmatter.updated_at = nowIso
    if (typeof content === 'string') file.content = content

    const md = serializeTask(file)
    const idx = list.findIndex(x => x.id === id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], title: file.frontmatter.title, status: file.frontmatter.status, priority: file.frontmatter.priority, position: file.frontmatter.position, tags: file.frontmatter.tags, updated_at: nowIso, project_id: file.frontmatter.project_id, due_date: file.frontmatter.due_date, completed_at: file.frontmatter.completed_at, recurring: file.frontmatter.recurring, focus_exclude: file.frontmatter.focus_exclude }
    }
    if (hasGitHub) {
      await commitFiles({ message: `feat(task): update ${id} - ${file.frontmatter.title}`,
        files: [ { path: item.file_path, content: md }, { path: TASKS_INDEX_PATH, content: JSON.stringify(list, null, 2) } ] })
    } else {
      devTasksUpdate(item.file_path, file, { title: file.frontmatter.title, status: file.frontmatter.status, priority: file.frontmatter.priority, position: file.frontmatter.position, tags: file.frontmatter.tags, updated_at: nowIso, project_id: file.frontmatter.project_id })
    }
    try { revalidateTag('tasks-index') } catch {}
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
