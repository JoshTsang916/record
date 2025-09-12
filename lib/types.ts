export type IdeaStatus = 'draft' | 'curating' | 'todo' | 'done'

export interface IdeaFrontmatter {
  id: string
  title: string
  created_at: string
  updated_at: string
  status: IdeaStatus
  importance: number
  tags: string[]
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

