import { NextResponse } from 'next/server'
import { readIndex } from '@/lib/github'
import { withRetry } from '@/lib/utils'
import { devList } from '@/lib/devStore'

export async function GET() {
  try {
    let list
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (hasGitHub) list = await withRetry(() => readIndex(), 2)
    else list = devList()
    // newest first
    list.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return NextResponse.json({ items: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
