import { NextRequest, NextResponse } from 'next/server'
import { readIndex } from '@/lib/github'
import { devList } from '@/lib/devStore'
import { deleteFilesAndUpdateIndex } from '@/lib/github_delete'
import { devRemove } from '@/lib/devStore'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    const list = hasGitHub ? await readIndex() : devList()
    const item = list.find(x => x.id === id)
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (hasGitHub) {
      await deleteFilesAndUpdateIndex(item.file_path, list)
    } else {
      devRemove(item.file_path, id)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

