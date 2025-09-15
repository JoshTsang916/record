import { NextResponse } from 'next/server'
import { readProjectsIndex } from '@/lib/github'
import { devProjectsList } from '@/lib/devProjects'

export async function GET() {
  try {
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    const list = hasGitHub ? await readProjectsIndex() : devProjectsList()
    // sort by updated_at desc then priority desc
    list.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || (b.priority - a.priority))
    return NextResponse.json({ items: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

