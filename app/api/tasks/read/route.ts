import { NextRequest, NextResponse } from 'next/server'
import { readTasksIndex, readTaskFileByPath } from '@/lib/github'
import { devTasksList, devTasksRead } from '@/lib/devTasks'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const directPath = searchParams.get('path') || searchParams.get('file_path')
    if (!id && !directPath) return NextResponse.json({ error: 'id or file_path required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (directPath) {
      const file = hasGitHub ? await readTaskFileByPath(directPath) : (devTasksRead(directPath)!)
      const fm = file.frontmatter
      const item = { id: fm.id, project_id: fm.project_id, title: fm.title, status: fm.status, priority: fm.priority, position: fm.position, tags: fm.tags, created_at: fm.created_at, updated_at: fm.updated_at, file_path: directPath }
      return NextResponse.json({ item, file })
    } else {
      const list = hasGitHub ? await readTasksIndex() : devTasksList()
      const item = list.find(x => x.id === id)
      if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
      const file = hasGitHub ? await readTaskFileByPath(item.file_path) : (devTasksRead(item.file_path)!)
      return NextResponse.json({ item, file })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

