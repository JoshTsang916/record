import { INDEX_PATH } from './id'
import { IndexRecord, IdeaFile } from './types'
import { parseIdea, serializeIdea } from './markdown'

function getRepo() {
  const repo = process.env.GITHUB_REPO
  if (!repo) throw new Error('GITHUB_REPO not set')
  const [owner, name] = repo.split('/')
  if (!owner || !name) throw new Error('GITHUB_REPO must be owner/repo')
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

async function getDefaultBranch(): Promise<string> {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers: ghHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to get repo info')
  const json = await res.json()
  return json.default_branch || 'main'
}

async function getHeadSha(branch: string): Promise<string> {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/refs/heads/${branch}`, { headers: ghHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to get ref')
  const json = await res.json()
  return json.object.sha
}

async function getCommit(sha: string): Promise<any> {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/commits/${sha}`, { headers: ghHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to get commit')
  return res.json()
}

async function createBlob(content: string | Uint8Array, encoding: 'utf-8' | 'base64') {
  const { owner, name } = getRepo()
  const body: any = { encoding }
  if (encoding === 'base64' && content instanceof Uint8Array) {
    body.content = Buffer.from(content).toString('base64')
  } else if (encoding === 'base64' && typeof content === 'string') {
    body.content = Buffer.from(content, 'utf-8').toString('base64')
  } else {
    body.content = typeof content === 'string' ? content : Buffer.from(content).toString('utf-8')
  }
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/blobs`, {
    method: 'POST', headers: ghHeaders(), body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error('Failed to create blob')
  const json = await res.json()
  return json.sha as string
}

async function createTree(baseTree: string, treeItems: Array<{ path: string, sha: string, mode?: string, type?: string }>) {
  const { owner, name } = getRepo()
  const tree = treeItems.map(it => ({
    path: it.path,
    mode: it.mode || '100644',
    type: it.type || 'blob',
    sha: it.sha
  }))
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/trees`, {
    method: 'POST', headers: ghHeaders(), body: JSON.stringify({ base_tree: baseTree, tree })
  })
  if (!res.ok) throw new Error('Failed to create tree')
  const json = await res.json()
  return json.sha as string
}

async function createCommit(message: string, treeSha: string, parentSha: string) {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/commits`, {
    method: 'POST', headers: ghHeaders(), body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] })
  })
  if (!res.ok) throw new Error('Failed to create commit')
  const json = await res.json()
  return json.sha as string
}

async function updateRef(branch: string, sha: string) {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/refs/heads/${branch}`, {
    method: 'PATCH', headers: ghHeaders(), body: JSON.stringify({ sha })
  })
  if (!res.ok) throw new Error('Failed to update ref')
}

export async function commitFiles({ message, files, branch }: { message: string, files: Array<{ path: string, content: string | Uint8Array, binary?: boolean }>, branch?: string }) {
  const br = branch || await getDefaultBranch()
  const headSha = await getHeadSha(br)
  const headCommit = await getCommit(headSha)
  const baseTree = headCommit.tree.sha
  const blobs = await Promise.all(files.map(f => createBlob(f.content, f.binary ? 'base64' : 'utf-8')))
  const treeSha = await createTree(baseTree, files.map((f, i) => ({ path: f.path, sha: blobs[i] })))
  const commitSha = await createCommit(message, treeSha, headSha)
  await updateRef(br, commitSha)
  return { commitSha }
}

export async function getContent(path: string, ref?: string) {
  const { owner, name } = getRepo()
  const url = new URL(`https://api.github.com/repos/${owner}/${name}/contents/${encodeURIComponent(path)}`)
  if (ref) url.searchParams.set('ref', ref)
  const res = await fetch(url.toString(), { headers: ghHeaders(), cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to get content')
  const json = await res.json()
  if (json.encoding === 'base64') {
    const buf = Buffer.from(json.content, 'base64')
    return buf.toString('utf-8')
  }
  return json.content
}

export async function upsertIndex(update: (list: IndexRecord[]) => IndexRecord[]): Promise<IndexRecord[]> {
  const body = await getContent(INDEX_PATH)
  const list: IndexRecord[] = body ? JSON.parse(body) : []
  const next = update(Array.isArray(list) ? list : [])
  await commitFiles({ message: 'chore(index): update index', files: [ { path: INDEX_PATH, content: JSON.stringify(next, null, 2) } ] })
  return next
}

export async function readIdeaFileByPath(path: string): Promise<IdeaFile> {
  const body = await getContent(path)
  if (!body) throw new Error('Idea file not found')
  return parseIdea(body)
}

export async function readIndex(): Promise<IndexRecord[]> {
  const body = await getContent(INDEX_PATH)
  return body ? JSON.parse(body) : []
}

export async function replaceIndex(list: IndexRecord[], message = 'chore(index): update index') {
  await commitFiles({ message, files: [{ path: INDEX_PATH, content: JSON.stringify(list, null, 2) }] })
}

export function buildIdeaMarkdown(file: IdeaFile) {
  return serializeIdea(file)
}

export async function rawUrlForPath(path: string): Promise<string> {
  const { owner, name } = getRepo()
  const branch = await getDefaultBranch()
  return `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${path.replace(/^\//, '')}`
}
