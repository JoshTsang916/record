import { IdeaFile, IdeaFrontmatter } from './types'

// Very small frontmatter serializer to predictable YAML subset
export function serializeIdea({ frontmatter, content }: IdeaFile): string {
  const fm = frontmatter
  const yaml = [
    '---',
    `id: ${fm.id}`,
    `title: ${escapeYaml(fm.title)}`,
    `created_at: ${fm.created_at}`,
    `updated_at: ${fm.updated_at}`,
    `status: ${fm.status}`,
    `importance: ${fm.importance}`,
    `tags: [${fm.tags.map(escapeYaml).join(', ')}]`,
    'audio:',
    `  url: ${fm.audio.url}`,
    `  duration_sec: ${fm.audio.duration_sec}`,
    'transcript:',
    `  model: ${fm.transcript.model}`,
    `  confidence: ${fm.transcript.confidence}`,
    `summary: ${escapeYaml(fm.summary)}`,
    'relations:',
    `  links: [${fm.relations.links.map(escapeYaml).join(', ')}]`,
    '---',
    '',
    content || ''
  ].join('\n')
  return yaml
}

export function parseIdea(md: string): IdeaFile {
  const fmStart = md.indexOf('---')
  if (fmStart !== 0) throw new Error('Invalid frontmatter')
  const fmEnd = md.indexOf('\n---', 3)
  if (fmEnd === -1) throw new Error('Invalid frontmatter end')
  const fmBlock = md.slice(3, fmEnd).trim() // content between markers
  const content = md.slice(fmEnd + 4).replace(/^\n/, '')
  const lines = fmBlock.split(/\r?\n/)
  const data: any = {}
  let currentNested: any = null
  let currentKey = ''
  for (const line of lines) {
    if (/^\s{2,}/.test(line)) {
      // nested
      const [k, v] = splitKeyValue(line.trim())
      if (currentNested && k) currentNested[k] = parseValue(v)
    } else {
      const [k, v] = splitKeyValue(line.trim())
      if (!k) continue
      if (v === undefined) {
        // nested object start
        data[k] = {}
        currentNested = data[k]
        currentKey = k
      } else {
        data[k] = parseValue(v)
        currentNested = null
        currentKey = k
      }
    }
  }
  // normalize types
  const fm: IdeaFrontmatter = {
    id: data.id || '',
    title: String(data.title || ''),
    created_at: String(data.created_at || ''),
    updated_at: String(data.updated_at || ''),
    status: (data.status || 'draft'),
    importance: Number(data.importance || 1),
    tags: Array.isArray(data.tags) ? data.tags : [],
    audio: {
      url: data.audio?.url || '',
      duration_sec: Number(data.audio?.duration_sec || 0)
    },
    transcript: {
      model: data.transcript?.model || '',
      confidence: Number(data.transcript?.confidence || 0)
    },
    summary: String(data.summary || ''),
    relations: { links: Array.isArray(data.relations?.links) ? data.relations.links : [] }
  }
  return { frontmatter: fm, content }
}

function splitKeyValue(line: string): [string, string | undefined] {
  const idx = line.indexOf(':')
  if (idx === -1) return [line.trim(), undefined]
  const key = line.slice(0, idx).trim()
  const value = line.slice(idx + 1).trim()
  return [key, value]
}

function parseValue(raw: string | undefined): any {
  if (raw === undefined) return undefined
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map(s => unescapeYaml(s.trim()))
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  if (raw === 'true') return true
  if (raw === 'false') return false
  return unescapeYaml(raw)
}

function escapeYaml(v: string): string {
  const s = String(v || '')
  if (s.includes(':') || s.includes('#') || s.includes('[') || s.includes(']')) {
    return `'${s.replace(/'/g, "''")}'`
  }
  return s
}

function unescapeYaml(v: string): string {
  const s = String(v || '')
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('\'') && s.endsWith('\''))) {
    return s.slice(1, -1).replace(/''/g, "'")
  }
  return s
}

