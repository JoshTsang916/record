export function generateId() {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `idea_${ts}_${rand}`
}

export function yyyymm(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}/${m}`
}

export function ideaMdPath(id: string, iso: string) {
  const d = new Date(iso)
  return `ideas/${yyyymm(d)}/${id}.md`
}

export function audioPath(id: string, iso: string, ext: string) {
  const d = new Date(iso)
  return `public/audio/${yyyymm(d)}/${id}.${ext}`
}

export const INDEX_PATH = 'ideas/_index/index.json'

