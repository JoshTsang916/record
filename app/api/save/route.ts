import { NextRequest, NextResponse } from 'next/server'
import { readIndex, readIdeaFileByPath, commitFiles } from '@/lib/github'
import { parseIdea, serializeIdea } from '@/lib/markdown'
import { makeWebhookPayload, postWebhook } from '@/lib/webhook'
import { devList, devRead, devUpdate } from '@/lib/devStore'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, title, tags, importance, status, transcript, summary, project_id } = body || {}
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    const list = hasGitHub ? await readIndex() : devList()
    const item = list.find(x => x.id === id)
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const file = hasGitHub ? await readIdeaFileByPath(item.file_path) : (devRead(item.file_path)!)
    const nowIso = new Date().toISOString()
    file.frontmatter.title = title ?? file.frontmatter.title
    file.frontmatter.tags = Array.isArray(tags) ? tags : file.frontmatter.tags
    file.frontmatter.importance = typeof importance === 'number' ? importance : file.frontmatter.importance
    file.frontmatter.status = status ?? file.frontmatter.status
    file.frontmatter.updated_at = nowIso
    if (typeof project_id === 'string') (file.frontmatter as any).project_id = project_id
    file.frontmatter.summary = typeof summary === 'string' ? summary : file.frontmatter.summary
    if (typeof transcript === 'string') file.content = transcript

    const md = serializeIdea(file)
    // update index record
    const idx = list.findIndex(x => x.id === id)
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        title: file.frontmatter.title || list[idx].title,
        tags: file.frontmatter.tags,
        status: file.frontmatter.status,
        importance: file.frontmatter.importance,
      }
    }
    if (hasGitHub) {
      const message = `feat(idea): update ${id} - ${file.frontmatter.title}`
      await commitFiles({ message, files: [ { path: item.file_path, content: md }, { path: 'ideas/_index/index.json', content: JSON.stringify(list, null, 2) } ] })
    } else {
      devUpdate(item.file_path, file, {
        title: file.frontmatter.title,
        tags: file.frontmatter.tags,
        status: file.frontmatter.status,
        importance: file.frontmatter.importance
      })
    }

    // webhook
    const payload = makeWebhookPayload({
      id,
      title: file.frontmatter.title,
      tags: file.frontmatter.tags,
      status: file.frontmatter.status,
      importance: file.frontmatter.importance,
      audio_url: file.frontmatter.audio.url,
      text: file.content,
      created_at: file.frontmatter.created_at
    })
    await postWebhook('idea.updated', payload)

    try { revalidateTag('ideas-index') } catch {}
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
