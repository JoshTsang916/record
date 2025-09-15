import { NextRequest, NextResponse } from 'next/server'
import { readProjectsIndex, readProjectFileByPath, commitFiles } from '@/lib/github'
import { serializeProject } from '@/lib/markdown'
import { PROJECTS_INDEX_PATH } from '@/lib/id'
import { devProjectsList, devProjectsRead, devProjectsUpdate } from '@/lib/devProjects'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, title, description, status, priority, tags, content } = body || {}
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    const list = hasGitHub ? await readProjectsIndex() : devProjectsList()
    const item = list.find(x => x.id === id)
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const file = hasGitHub ? await readProjectFileByPath(item.file_path) : (devProjectsRead(item.file_path)!)
    const nowIso = new Date().toISOString()
    file.frontmatter.title = title ?? file.frontmatter.title
    file.frontmatter.description = description ?? file.frontmatter.description
    file.frontmatter.status = status ?? file.frontmatter.status
    file.frontmatter.priority = typeof priority === 'number' ? priority : file.frontmatter.priority
    file.frontmatter.tags = Array.isArray(tags) ? tags : file.frontmatter.tags
    file.frontmatter.updated_at = nowIso
    if (typeof content === 'string') file.content = content
    const md = serializeProject(file)

    // update index fields
    const idx = list.findIndex(x => x.id === id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], title: file.frontmatter.title, status: file.frontmatter.status, priority: file.frontmatter.priority, tags: file.frontmatter.tags, updated_at: nowIso }
    }
    if (hasGitHub) {
      await commitFiles({ message: `feat(project): update ${id} - ${file.frontmatter.title}`,
        files: [ { path: item.file_path, content: md }, { path: PROJECTS_INDEX_PATH, content: JSON.stringify(list, null, 2) } ] })
    } else {
      devProjectsUpdate(item.file_path, file, { title: file.frontmatter.title, status: file.frontmatter.status, priority: file.frontmatter.priority, tags: file.frontmatter.tags, updated_at: nowIso })
    }
    try { revalidateTag('projects-index') } catch {}
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

