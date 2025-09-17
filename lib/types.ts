export type IdeaStatus = 'draft' | 'curating' | 'todo' | 'done' | 'archived'

export interface IdeaFrontmatter {
  id: string
  title: string
  created_at: string
  updated_at: string
  status: IdeaStatus
  importance: number
  tags: string[]
  project_id?: string
  audio: {
    url: string
    duration_sec: number
  }
  transcript: {
    model: string
    confidence: number
  }
  summary: string
  relations: {
    links: string[]
  }
}

export interface IndexRecord {
  id: string
  title: string
  created_at: string
  tags: string[]
  status: IdeaStatus
  importance: number
  audio_url: string
  file_path: string
}

export interface IdeaFile {
  frontmatter: IdeaFrontmatter
  content: string
}

// Project/Task models
export type ProjectStatus = 'active' | 'archived'
export interface ProjectFrontmatter {
  id: string
  title: string
  description: string
  created_at: string
  updated_at: string
  status: ProjectStatus
  priority: number
  tags: string[]
  relations: { links: string[] }
}
export interface ProjectIndexRecord {
  id: string
  title: string
  status: ProjectStatus
  priority: number
  tags: string[]
  created_at: string
  updated_at: string
  file_path: string
}
export interface ProjectFile {
  frontmatter: ProjectFrontmatter
  content: string
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done' | 'archived'
export interface TaskFrontmatter {
  id: string
  project_id: string
  title: string
  description: string
  created_at: string
  updated_at: string
  status: TaskStatus
  priority: number
  tags: string[]
  due_date?: string
  completed_at?: string
  estimate?: number
  assignee?: string
  position: number
  relations: { links: string[] }
}
export interface TaskIndexRecord {
  id: string
  project_id: string
  title: string
  status: TaskStatus
  priority: number
  position: number
  tags: string[]
  created_at: string
  updated_at: string
  due_date?: string
  completed_at?: string
  file_path: string
}
export interface TaskFile {
  frontmatter: TaskFrontmatter
  content: string
}
