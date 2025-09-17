import { NextRequest, NextResponse } from 'next/server'
import { commitFiles, readTasksIndex } from '@/lib/github'
import { taskId, taskMdPath, TASKS_INDEX_PATH } from '@/lib/id'
import { serializeTask } from '@/lib/markdown'
import type { TaskFrontmatter, TaskIndexRecord } from '@/lib/types'
import { revalidateTag } from 'next/cache'
import { devTasksAdd } from '@/lib/devTasks'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nowIso = new Date().toISOString()
    const id = taskId()
    const fm: TaskFrontmatter = {
      id,
      project_id: String(body.project_id || ''),
      title: String(body.title || 'Untitled Task'),
      description: String(body.description || ''),
      created_at: nowIso,
      updated_at: nowIso,
      status: (['backlog','todo','in_progress','blocked','done','archived'].includes(body.status) ? body.status : 'backlog'),
      priority: Number(body.priority || 3),
      tags: Array.isArray(body.tags) ? body.tags : [],
      due_date: body.due_date ? String(body.due_date) : undefined,
      completed_at: undefined,
      recurring: body.recurring === 'daily' ? 'daily' : undefined,
      focus_exclude: body.focus_exclude === true,
      estimate: typeof body.estimate === 'number' ? body.estimate : undefined,
      assignee: body.assignee ? String(body.assignee) : undefined,
      position: Number(body.position || Date.now()),
      relations: { links: [] }
    }
    const mdPath = taskMdPath(id, nowIso)
    const md = serializeTask({ frontmatter: fm, content: body.content || '' })

    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (hasGitHub) {
      const list = await readTasksIndex()
      const record: TaskIndexRecord = {
        id, project_id: fm.project_id, title: fm.title, status: fm.status, priority: fm.priority, position: fm.position,
        tags: fm.tags, created_at: fm.created_at, updated_at: fm.updated_at, due_date: fm.due_date, completed_at: fm.completed_at, recurring: fm.recurring, focus_exclude: fm.focus_exclude, file_path: mdPath
      }
      const next = [record, ...list.filter(x => x.id !== id)]
      await commitFiles({ message: `feat(task): add ${id} - ${fm.title}`, files: [
        { path: mdPath, content: md },
        { path: TASKS_INDEX_PATH, content: JSON.stringify(next, null, 2) }
      ] })
    } else {
      const record: TaskIndexRecord = {
        id, project_id: fm.project_id, title: fm.title, status: fm.status, priority: fm.priority, position: fm.position,
        tags: fm.tags, created_at: fm.created_at, updated_at: fm.updated_at, due_date: fm.due_date, completed_at: fm.completed_at, recurring: fm.recurring, focus_exclude: fm.focus_exclude, file_path: mdPath
      }
      devTasksAdd(mdPath, { frontmatter: fm, content: body.content || '' }, record)
    }
    try { revalidateTag('tasks-index') } catch {}
    return NextResponse.json({ ok: true, id, file_path: mdPath })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
