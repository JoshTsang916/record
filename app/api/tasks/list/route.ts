import { NextRequest, NextResponse } from 'next/server'
import { readTasksIndex } from '@/lib/github'
import { devTasksList } from '@/lib/devTasks'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id') || ''
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    let list = hasGitHub ? await readTasksIndex() : devTasksList()
    if (projectId) list = list.filter(t => t.project_id === projectId)
    // sort by position asc, then priority desc, then updated desc
    list.sort((a, b) => (a.position - b.position) || (b.priority - a.priority) || b.updated_at.localeCompare(a.updated_at))
    return NextResponse.json({ items: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

