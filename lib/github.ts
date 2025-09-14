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

async function ensureOk(res: Response, context: string) {
  if (res.ok) return
  let detail = ''
  try {
    const txt = await res.text()
    detail = txt
  } catch {}
  throw new Error(`${context} failed (${res.status}): ${detail || res.statusText}`)
}

async function getDefaultBranch(): Promise<string> {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers: ghHeaders(), cache: 'no-store' })
  await ensureOk(res, 'Get repo info')
  const json = await res.json()
  return json.default_branch || 'main'
}

async function getHeadSha(branch: string): Promise<string | null> {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/refs/heads/${branch}`, { headers: ghHeaders(), cache: 'no-store' })
  if (res.status === 404 || res.status === 409) return null // 409: repository empty
  await ensureOk(res, 'Get ref')
  const json = await res.json()
  return json.object.sha
}

async function getCommit(sha: string): Promise<any> {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/commits/${sha}`, { headers: ghHeaders(), cache: 'no-store' })
  await ensureOk(res, 'Get commit')
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
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/blobs`, { method: 'POST', headers: ghHeaders(), body: JSON.stringify(body) })
  await ensureOk(res, 'Create blob')
  const json = await res.json()
  return json.sha as string
}

async function createTree(baseTree: string | null, treeItems: Array<{ path: string, sha: string, mode?: string, type?: string }>) {
  const { owner, name } = getRepo()
  const tree = treeItems.map(it => ({
    path: it.path,
    mode: it.mode || '100644',
    type: it.type || 'blob',
    sha: it.sha
  }))
  const body: any = { tree }
  if (baseTree) body.base_tree = baseTree
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/trees`, { method: 'POST', headers: ghHeaders(), body: JSON.stringify(body) })
  await ensureOk(res, 'Create tree')
  const json = await res.json()
  return json.sha as string
}

async function createCommit(message: string, treeSha: string, parentSha?: string) {
  const { owner, name } = getRepo()
  const parents = parentSha ? [parentSha] : []
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/commits`, { method: 'POST', headers: ghHeaders(), body: JSON.stringify({ message, tree: treeSha, parents }) })
  await ensureOk(res, 'Create commit')
  const json = await res.json()
  return json.sha as string
}

async function updateRef(branch: string, sha: string) {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/refs/heads/${branch}`, { method: 'PATCH', headers: ghHeaders(), body: JSON.stringify({ sha }) })
  await ensureOk(res, 'Update ref')
}

async function createRef(branch: string, sha: string) {
  const { owner, name } = getRepo()
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/refs`, { method: 'POST', headers: ghHeaders(), body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }) })
  await ensureOk(res, 'Create ref')
}

export async function commitFiles({ message, files, branch }: { message: string, files: Array<{ path: string, content: string | Uint8Array, binary?: boolean }>, branch?: string }) {
  const br = branch || await getDefaultBranch()
  const headSha = await getHeadSha(br)
  const blobs = await Promise.all(files.map(f => createBlob(f.content, f.binary ? 'base64' : 'utf-8')))
  if (!headSha) {
    // initial commit on empty repo/branch
    const treeSha = await createTree(null, files.map((f, i) => ({ path: f.path, sha: blobs[i] })))
    const commitSha = await createCommit(message, treeSha)
    await createRef(br, commitSha)
    return { commitSha }
  }
  const headCommit = await getCommit(headSha)
  const baseTree = headCommit.tree.sha
  const treeSha = await createTree(baseTree, files.map((f, i) => ({ path: f.path, sha: blobs[i] })))
  const commitSha = await createCommit(message, treeSha, headSha)
  await updateRef(br, commitSha)
  return { commitSha }
}

export async function getContent(path: string, ref?: string, init?: RequestInit & { next?: { revalidate?: number, tags?: string[] } }) {
  const { owner, name } = getRepo()
  const url = new URL(`https://api.github.com/repos/${owner}/${name}/contents/${encodeURIComponent(path)}`)
  if (ref) url.searchParams.set('ref', ref)
  const fetchInit: any = { headers: ghHeaders() }
  if (init && init.next) fetchInit.next = init.next
  else fetchInit.cache = 'no-store'
  const res = await fetch(url.toString(), fetchInit)
  if (res.status === 404) return null
  await ensureOk(res, 'Get content')
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
  // Use short revalidate and cache tag to accelerate list fetches.
  const body = await getContent(INDEX_PATH, undefined, { next: { revalidate: 15, tags: ['ideas-index'] } })
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
