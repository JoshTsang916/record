import { first160 } from './utils'

export async function postWebhook(event: 'idea.created'|'idea.updated', payload: {
  id: string
  title: string
  tags: string[]
  status: string
  importance: number
  audio_url: string
  text_excerpt: string
  created_at: string
}) {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload })
    })
  } catch (e) {
    // swallow
  }
}

export function makeWebhookPayload(p: {
  id: string
  title: string
  tags: string[]
  status: string
  importance: number
  audio_url: string
  text: string
  created_at: string
}) {
  return {
    id: p.id,
    title: p.title,
    tags: p.tags,
    status: p.status,
    importance: p.importance,
    audio_url: absoluteUrl(p.audio_url),
    text_excerpt: first160(p.text),
    created_at: p.created_at
  }
}

function absoluteUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  return base ? `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : `/${path.replace(/^\//, '')}`
}

