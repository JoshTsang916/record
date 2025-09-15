import { NextRequest, NextResponse } from 'next/server'
import { commitFiles } from '@/lib/github'
import { generateId, ideaMdPath, audioPath, INDEX_PATH } from '@/lib/id'
import { serializeIdea } from '@/lib/markdown'
import { transcribeIfNeeded } from '@/lib/transcription'
import { makeWebhookPayload, postWebhook } from '@/lib/webhook'
import type { IdeaFrontmatter, IndexRecord } from '@/lib/types'
import { devAdd } from '@/lib/devStore'
import { revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || ''
    let title = ''
    let tags: string[] = []
    let wantTranscription = true
    let durationSec = 0
    let textOnly = ''
    let audioFile: File | null = null
    let importance: number = 3
    let status: 'draft'|'curating'|'todo'|'done'|'archived' = 'draft'
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      const t = form.get('title')
      const tg = form.get('tags')
      const wt = form.get('wantTranscription')
      const dur = form.get('durationSec')
      const txt = form.get('text')
      const imp = form.get('importance')
      const st = form.get('status')
      const pid = form.get('project_id')
      title = typeof t === 'string' ? t : ''
      tags = typeof tg === 'string' ? tg.split(',').map(s => s.trim()).filter(Boolean) : []
      wantTranscription = typeof wt === 'string' ? wt === 'true' : true
      durationSec = typeof dur === 'string' ? Number(dur) || 0 : 0
      textOnly = typeof txt === 'string' ? txt : ''
      if (typeof imp === 'string') importance = Number(imp) || 3
      if (typeof st === 'string') status = (['draft','curating','todo','done','archived'].includes(st) ? st : 'draft') as any
      const projectId = typeof pid === 'string' ? pid : ''
      const a = form.get('audio')
      if (a && a instanceof File) audioFile = a
      // attach to closure via adding property; we'll set in frontmatter below
      ;(globalThis as any).__projectId = projectId
    } else {
      const json = await req.json()
      title = json.title || ''
      tags = Array.isArray(json.tags) ? json.tags : []
      wantTranscription = json.wantTranscription !== false
      durationSec = Number(json.durationSec || 0)
      textOnly = json.text || ''
      if (json.importance) importance = Number(json.importance) || 3
      if (json.status) status = (['draft','curating','todo','done','archived'].includes(json.status) ? json.status : 'draft') as any
      ;(globalThis as any).__projectId = typeof json.project_id === 'string' ? json.project_id : ''
      // audio is not supported in JSON body here
    }

    if (!audioFile && !textOnly) {
      return NextResponse.json({ error: 'No audio or text provided' }, { status: 400 })
    }

    const id = generateId()
    const nowIso = new Date().toISOString()

    const SAVE_AUDIO = (process.env.SAVE_AUDIO || '').toLowerCase() === 'true'
    let ext = 'webm'
    let audioUrl = ''
    let audioContent: Uint8Array | null = null
    if (audioFile && SAVE_AUDIO) {
      const mime = audioFile.type || ''
      if (mime.includes('mp4') || mime.includes('aac') || mime.includes('m4a')) ext = 'm4a'
      else if (mime.includes('webm')) ext = 'webm'
      else if (mime.includes('mpeg')) ext = 'mp3'
      const buf = new Uint8Array(await audioFile.arrayBuffer())
      audioContent = buf
    }

    let transcriptText = textOnly
    let model = ''
    let conf = 0
    if (!transcriptText && audioFile) {
      const tr = await transcribeIfNeeded(audioFile, wantTranscription)
      transcriptText = tr.text
      model = tr.model
      conf = tr.confidence
    }

    const fm: IdeaFrontmatter = {
      id,
      title: title || (transcriptText ? transcriptText.split('\n')[0].slice(0, 80) : 'Untitled'),
      created_at: nowIso,
      updated_at: nowIso,
      status: (status as any) || 'draft',
      importance: typeof importance === 'number' ? importance : 3,
      tags,
      project_id: ((globalThis as any).__projectId || '') as any,
      audio: { url: '', duration_sec: durationSec },
      transcript: { model, confidence: conf },
      summary: '',
      relations: { links: [] }
    }

    const mdPath = ideaMdPath(id, nowIso)
    const md = serializeIdea({ frontmatter: fm, content: transcriptText })

    // update index
    const currentIndexBody = await (async () => {
      try { const s = await fetchIndex(); return s } catch { return '[]' }
    })()
    const list: IndexRecord[] = JSON.parse(currentIndexBody || '[]')
    const record: IndexRecord = {
      id: fm.id,
      title: fm.title,
      created_at: fm.created_at,
      tags: fm.tags,
      status: fm.status,
      importance: fm.importance,
      audio_url: '',
      file_path: mdPath
    }
    const next = [record, ...list.filter(x => x.id !== record.id)]

    const files: Array<{ path: string, content: string | Uint8Array, binary?: boolean }> = [
      { path: mdPath, content: md },
      { path: INDEX_PATH, content: JSON.stringify(next, null, 2) }
    ]
    if (audioContent && SAVE_AUDIO) {
      const path = audioPath(id, nowIso, ext)
      files.push({ path, content: audioContent, binary: true })
    }

    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (hasGitHub) {
      const message = `feat(idea): add ${id} - ${fm.title}`
      await commitFiles({ message, files })
    } else {
      // local dev store
      devAdd(mdPath, { frontmatter: fm, content: transcriptText }, record)
    }

    // webhook
    const payload = makeWebhookPayload({
      id: fm.id,
      title: fm.title,
      tags: fm.tags,
      status: fm.status,
      importance: fm.importance,
      audio_url: '',
      text: transcriptText,
      created_at: fm.created_at
    })
    await postWebhook('idea.created', payload)

    try { revalidateTag('ideas-index') } catch {}
    return NextResponse.json({ ok: true, id, file_path: mdPath })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

async function fetchIndex(): Promise<string> {
  const repo = process.env.GITHUB_REPO
  const token = process.env.GITHUB_TOKEN
  if (!repo || !token) throw new Error('Missing GitHub env')
  const [owner, name] = repo.split('/')
  const url = `https://api.github.com/repos/${owner}/${name}/contents/${encodeURIComponent('ideas/_index/index.json')}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, cache: 'no-store' })
  if (res.status === 404) return '[]'
  if (!res.ok) throw new Error('Failed to read index')
  const json = await res.json()
  if (json.encoding === 'base64') return Buffer.from(json.content, 'base64').toString('utf-8')
  return json.content
}
