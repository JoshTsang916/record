// In-memory store for local dev without GitHub
import { IdeaFile } from './types'
import { IndexRecord } from './types'

const store = {
  index: [] as IndexRecord[],
  files: new Map<string, IdeaFile>(),
}

export function devAdd(filePath: string, file: IdeaFile, record: IndexRecord) {
  store.files.set(filePath, file)
  store.index = [record, ...store.index.filter(i => i.id !== record.id)]
}

export function devList(): IndexRecord[] { return [...store.index] }

export function devRead(filePath: string): IdeaFile | null {
  return store.files.get(filePath) || null
}

export function devUpdate(filePath: string, updated: IdeaFile, updateRecord?: Partial<IndexRecord>) {
  store.files.set(filePath, updated)
  if (updateRecord) {
    store.index = store.index.map(r => r.file_path === filePath ? { ...r, ...updateRecord } : r)
  }
}

