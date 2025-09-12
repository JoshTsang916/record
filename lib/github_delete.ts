import { INDEX_PATH } from './id'
import { commitFiles, getContent, readIndex } from './github'

function getRepo() {
  const repo = process.env.GITHUB_REPO
  if (!repo) throw new Error('GITHUB_REPO not set')
  const [owner, name] = repo.split('/')
  return { owner, name }
}

function ghHeaders() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not set')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
}

export async function getContentSha(path: string): Promise<string | null> {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${encodeURIComponent(path)}`, { headers: ghHeaders(), cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to get content sha')
  const json = await res.json()
  return json.sha || null
}

export async function deleteViaContents(path: string, message: string, sha?: string) {
  const { owner, name } = getRepo()
  const s = sha || await getContentSha(path)
  if (!s) return // already absent
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${encodeURIComponent(path)}`, {
    method: 'DELETE', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ message, sha: s })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Delete failed (${res.status}): ${txt}`)
  }
}

export async function deleteFilesAndUpdateIndex(mdPath: string, list?: any[]) {
  const message = `feat(idea): delete ${mdPath}`
  // delete md via Contents API
  await deleteViaContents(mdPath, message)
  const idx = (list || await readIndex()).filter(r => r.file_path !== mdPath)
  await commitFiles({ message: 'chore(index): remove record', files: [{ path: INDEX_PATH, content: JSON.stringify(idx, null, 2) }] })
}

