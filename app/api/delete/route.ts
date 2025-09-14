import { NextRequest, NextResponse } from 'next/server'
import { readIndex } from '@/lib/github'
import { devList } from '@/lib/devStore'
import { deleteFilesAndUpdateIndex } from '@/lib/github_delete'
import { devRemove } from '@/lib/devStore'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const { id, file_path } = await req.json()
    if (!id && !file_path) return NextResponse.json({ error: 'id or file_path required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (hasGitHub) {
      if (file_path) {
        await deleteFilesAndUpdateIndex(file_path)
      } else {
        const list = await readIndex()
        const item = list.find(x => x.id === id)
        if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
        await deleteFilesAndUpdateIndex(item.file_path, list)
      }
    } else {
      if (file_path && id) devRemove(file_path, id)
      else {
        const list = devList()
        const item = list.find(x => x.id === id)
        if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
        devRemove(item.file_path, id!)
      }
    }
    // bust index cache tag if present
    try { revalidateTag('ideas-index') } catch {}
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
