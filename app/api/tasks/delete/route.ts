import { NextRequest, NextResponse } from 'next/server'
import { readTasksIndex, commitFiles } from '@/lib/github'
import { deleteViaContents } from '@/lib/github_delete'
import { TASKS_INDEX_PATH } from '@/lib/id'
import { devTasksList, devTasksRemove } from '@/lib/devTasks'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const { id, file_path } = await req.json()
    if (!id && !file_path) return NextResponse.json({ error: 'id or file_path required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (hasGitHub) {
      const list = await readTasksIndex()
      const fp = file_path || list.find(x => x.id === id)?.file_path
      if (!fp) return NextResponse.json({ error: 'not found' }, { status: 404 })
      await deleteViaContents(fp, `feat(task): delete ${fp}`)
      const next = list.filter(r => r.file_path !== fp && r.id !== id)
      await commitFiles({ message: 'chore(tasks): remove record', files: [{ path: TASKS_INDEX_PATH, content: JSON.stringify(next, null, 2) }] })
    } else {
      const list = devTasksList()
      const fp = file_path || list.find(x => x.id === id)?.file_path
      if (!fp) return NextResponse.json({ error: 'not found' }, { status: 404 })
      devTasksRemove(fp, id || '')
    }
    try { revalidateTag('tasks-index') } catch {}
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

