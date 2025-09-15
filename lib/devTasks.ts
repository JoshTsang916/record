import { TaskFile, TaskIndexRecord } from './types'

const store = {
  index: [] as TaskIndexRecord[],
  files: new Map<string, TaskFile>(),
}

export function devTasksAdd(filePath: string, file: TaskFile, record: TaskIndexRecord) {
  store.files.set(filePath, file)
  store.index = [record, ...store.index.filter(i => i.id !== record.id)]
}

export function devTasksList(): TaskIndexRecord[] { return [...store.index] }

export function devTasksRead(filePath: string): TaskFile | null { return store.files.get(filePath) || null }

export function devTasksUpdate(filePath: string, updated: TaskFile, updateRecord?: Partial<TaskIndexRecord>) {
  store.files.set(filePath, updated)
  if (updateRecord) store.index = store.index.map(r => r.file_path === filePath ? { ...r, ...updateRecord } : r)
}

export function devTasksRemove(filePath: string, id: string) {
  store.files.delete(filePath)
  store.index = store.index.filter(r => r.file_path !== filePath && r.id !== id)
}

