import { NextRequest, NextResponse } from 'next/server'
import { readProjectsIndex, readProjectFileByPath } from '@/lib/github'
import { devProjectsList, devProjectsRead } from '@/lib/devProjects'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const directPath = searchParams.get('path') || searchParams.get('file_path')
    if (!id && !directPath) return NextResponse.json({ error: 'id or file_path required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (directPath) {
      const file = hasGitHub ? await readProjectFileByPath(directPath) : (devProjectsRead(directPath)!)
      const fm = file.frontmatter
      const item = { id: fm.id, title: fm.title, status: fm.status, priority: fm.priority, tags: fm.tags, created_at: fm.created_at, updated_at: fm.updated_at, file_path: directPath }
      return NextResponse.json({ item, file })
    } else {
      const list = hasGitHub ? await readProjectsIndex() : devProjectsList()
      const item = list.find(x => x.id === id)
      if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
      const file = hasGitHub ? await readProjectFileByPath(item.file_path) : (devProjectsRead(item.file_path)!)
      return NextResponse.json({ item, file })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

