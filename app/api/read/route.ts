import { NextRequest, NextResponse } from 'next/server'
import { readIndex, readIdeaFileByPath } from '@/lib/github'
import { devList, devRead } from '@/lib/devStore'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    const list = hasGitHub ? await readIndex() : devList()
    const item = list.find(x => x.id === id)
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const file = hasGitHub ? await readIdeaFileByPath(item.file_path) : (devRead(item.file_path)!)
    return NextResponse.json({ item, file })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
