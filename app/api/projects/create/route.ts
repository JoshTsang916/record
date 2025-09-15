import { NextRequest, NextResponse } from 'next/server'
import { commitFiles, readProjectsIndex } from '@/lib/github'
import { projectId, projectMdPath, PROJECTS_INDEX_PATH } from '@/lib/id'
import { serializeProject } from '@/lib/markdown'
import type { ProjectFrontmatter, ProjectIndexRecord } from '@/lib/types'
import { revalidateTag } from 'next/cache'
import { devProjectsAdd, devProjectsList } from '@/lib/devProjects'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nowIso = new Date().toISOString()
    const id = projectId()
    const fm: ProjectFrontmatter = {
      id,
      title: String(body.title || 'Untitled Project'),
      description: String(body.description || ''),
      created_at: nowIso,
      updated_at: nowIso,
      status: (['active','archived'].includes(body.status) ? body.status : 'active'),
      priority: Number(body.priority || 3),
      tags: Array.isArray(body.tags) ? body.tags : [],
      relations: { links: [] }
    }
    const mdPath = projectMdPath(id, nowIso)
    const md = serializeProject({ frontmatter: fm, content: body.content || '' })

    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (hasGitHub) {
      const list = await readProjectsIndex()
      const record: ProjectIndexRecord = {
        id, title: fm.title, status: fm.status, priority: fm.priority, tags: fm.tags,
        created_at: fm.created_at, updated_at: fm.updated_at, file_path: mdPath
      }
      const next = [record, ...list.filter(x => x.id !== id)]
      await commitFiles({ message: `feat(project): add ${id} - ${fm.title}`, files: [
        { path: mdPath, content: md },
        { path: PROJECTS_INDEX_PATH, content: JSON.stringify(next, null, 2) }
      ] })
    } else {
      const record: ProjectIndexRecord = {
        id, title: fm.title, status: fm.status, priority: fm.priority, tags: fm.tags,
        created_at: fm.created_at, updated_at: fm.updated_at, file_path: mdPath
      }
      devProjectsAdd(mdPath, { frontmatter: fm, content: body.content || '' }, record)
    }
    try { revalidateTag('projects-index') } catch {}
    return NextResponse.json({ ok: true, id, file_path: mdPath })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

