import { NextRequest, NextResponse } from 'next/server'
import { commitFiles } from '@/lib/github'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message: string = body.message || 'chore: update files'
    const files: Array<{ path: string, content: string, encoding?: 'utf-8'|'base64' } & { binary?: boolean }> = body.files || []
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }
    const mapped = files.map(f => ({ path: f.path, content: f.encoding === 'base64' ? Buffer.from(f.content, 'base64') : f.content, binary: f.encoding === 'base64' }))
    const res = await commitFiles({ message, files: mapped })
    return NextResponse.json({ ok: true, ...res })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}

