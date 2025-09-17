import { NextResponse } from 'next/server'
import { readProjectsIndex, commitFiles, readTasksIndex } from '@/lib/github'
import { projectId, projectMdPath, PROJECTS_INDEX_PATH, taskId, taskMdPath, TASKS_INDEX_PATH } from '@/lib/id'
import { serializeProject, serializeTask } from '@/lib/markdown'
import type { ProjectFrontmatter, ProjectIndexRecord, TaskFrontmatter, TaskIndexRecord } from '@/lib/types'

export async function GET() {
  try {
    const nowIso = new Date().toISOString()
    const titles = ['深度閱讀','無壓力寫作','腦力激盪','AI 技術探索']
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (!hasGitHub) {
      return NextResponse.json({ error: 'Seed requires GitHub env configured' }, { status: 400 })
    }

    // ensure project "自我成長"
    const projects = await readProjectsIndex()
    let proj = projects.find(p => p.title === '自我成長')
    const files: Array<{ path: string, content: string }> = []
    if (!proj) {
      const pid = projectId()
      const ppath = projectMdPath(pid, nowIso)
      const pfm: ProjectFrontmatter = {
        id: pid,
        title: '自我成長',
        description: '日常精進與持續學習',
        created_at: nowIso,
        updated_at: nowIso,
        status: 'active',
        priority: 3,
        tags: [],
        relations: { links: [] }
      }
      const pmd = serializeProject({ frontmatter: pfm, content: '' })
      proj = { id: pid, title: pfm.title, status: pfm.status, priority: pfm.priority, tags: pfm.tags, created_at: pfm.created_at, updated_at: pfm.updated_at, file_path: ppath }
      const nextProjects = [proj, ...projects]
      files.push({ path: ppath, content: pmd })
      files.push({ path: PROJECTS_INDEX_PATH, content: JSON.stringify(nextProjects, null, 2) })
    }

    // ensure daily tasks
    const tasks = await readTasksIndex()
    const need: Array<{ title: string }> = titles.filter(t => !tasks.some(x => x.title === t && x.project_id === proj!.id))
      .map(title => ({ title }))
    for (const n of need) {
      const tid = taskId()
      const tpath = taskMdPath(tid, nowIso)
      const tfm: TaskFrontmatter = {
        id: tid,
        project_id: proj!.id,
        title: n.title,
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
      const tmd = serializeTask({ frontmatter: tfm, content: '' })
      const trec: TaskIndexRecord = { id: tid, project_id: proj!.id, title: tfm.title, status: tfm.status, priority: tfm.priority, position: tfm.position, tags: tfm.tags, created_at: tfm.created_at, updated_at: tfm.updated_at, due_date: tfm.due_date, completed_at: tfm.completed_at, recurring: tfm.recurring, file_path: tpath }
      const nextTasks = [trec, ...tasks.filter(x => x.id !== tid)]
      files.push({ path: tpath, content: tmd })
      files.push({ path: TASKS_INDEX_PATH, content: JSON.stringify(nextTasks, null, 2) })
    }

    if (files.length === 0) return NextResponse.json({ ok: true, created: 0, message: 'Already seeded' })
    await commitFiles({ message: 'feat(seed): add daily tasks and project 自我成長', files })
    return NextResponse.json({ ok: true, created: need.length, project_id: proj!.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

