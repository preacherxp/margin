export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived'

export type PostType = 'linkedin' | 'blog'

export interface LinkedinMeta {
  hook: string
  cta: string
  hashtags: string[]
  audience: string
}

export interface PostMeta {
  id: string
  title: string
  status: PostStatus
  type: PostType
  createdAt: string
  updatedAt: string
  scheduledFor: string | null
  publishedAt: string | null
  tags: string[]
  template: string | null
  path: string
}

export interface Post extends PostMeta {
  linkedin: LinkedinMeta
  assets: string[]
  versions: number
  body: string
}

export interface NewPostInput {
  title: string
  type: PostType
  template?: string | null
  tags?: string[]
}

export interface TemplateMeta {
  slug: string
  name: string
  description: string
  type: PostType
  tags: string[]
  isBuiltIn: boolean
  path?: string | null
}

export interface Template extends TemplateMeta {
  linkedin: LinkedinMeta
  body: string
}

export interface VersionMeta {
  postId: string
  ts: string
  bytes: number
  preview: string
}

export interface VersionContent {
  postId: string
  ts: string
  content: string
  updatedAt: string
  title: string
}
