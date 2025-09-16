import { NextRequest, NextResponse } from 'next/server'
import { readIndex, readIdeaFileByPath } from '@/lib/github'
import { withRetry } from '@/lib/utils'
import { devList, devRead } from '@/lib/devStore'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const directPath = searchParams.get('path') || searchParams.get('file_path')
    if (!id && !directPath) return NextResponse.json({ error: 'id or file_path required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (directPath) {
      const file = hasGitHub ? await readIdeaFileByPath(directPath) : (devRead(directPath)!)
      // derive a minimal item to keep response shape stable
      const fm = file.frontmatter
      const item = {
        id: fm.id,
        title: fm.title,
        created_at: fm.created_at,
        tags: fm.tags,
        status: fm.status,
        importance: fm.importance,
        audio_url: fm.audio.url,
        file_path: directPath
      }
      return NextResponse.json({ item, file })
    } else {
    const list = hasGitHub ? await withRetry(() => readIndex(), 2) : devList()
      const item = list.find(x => x.id === id)
      if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
      const file = hasGitHub ? await readIdeaFileByPath(item.file_path) : (devRead(item.file_path)!)
      return NextResponse.json({ item, file })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
