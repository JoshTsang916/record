import { ProjectFile, ProjectIndexRecord } from './types'

const store = {
  index: [] as ProjectIndexRecord[],
  files: new Map<string, ProjectFile>(),
}

export function devProjectsAdd(filePath: string, file: ProjectFile, record: ProjectIndexRecord) {
  store.files.set(filePath, file)
  store.index = [record, ...store.index.filter(i => i.id !== record.id)]
}

export function devProjectsList(): ProjectIndexRecord[] { return [...store.index] }

export function devProjectsRead(filePath: string): ProjectFile | null { return store.files.get(filePath) || null }

export function devProjectsUpdate(filePath: string, updated: ProjectFile, updateRecord?: Partial<ProjectIndexRecord>) {
  store.files.set(filePath, updated)
  if (updateRecord) store.index = store.index.map(r => r.file_path === filePath ? { ...r, ...updateRecord } : r)
}

export function devProjectsRemove(filePath: string, id: string) {
  store.files.delete(filePath)
  store.index = store.index.filter(r => r.file_path !== filePath && r.id !== id)
}

