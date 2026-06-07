import MiniSearch, { type Options, type SearchResult } from 'minisearch'
import type { Post } from '@/types/post'

export interface IndexedPost {
  id: string
  title: string
  tags: string
  body: string
  hook: string
  cta: string
  status: string
  type: string
}

const SEARCH_OPTIONS: Options<IndexedPost> = {
  idField: 'id',
  fields: ['title', 'tags', 'body', 'hook', 'cta'],
  storeFields: ['id', 'title', 'status', 'type', 'tags'],
  searchOptions: {
    boost: { title: 3, tags: 2, hook: 2 },
    prefix: true,
    fuzzy: 0.2,
    combineWith: 'AND',
  },
  extractField: (doc, field) => {
    const value = (doc as unknown as Record<string, unknown>)[field]
    if (Array.isArray(value)) return value.join(' ')
    if (value == null) return ''
    return String(value)
  },
}

export function createPostIndex(): MiniSearch<IndexedPost> {
  return new MiniSearch<IndexedPost>(SEARCH_OPTIONS)
}

export function postToIndexed(post: Post): IndexedPost {
  return {
    id: post.id,
    title: post.title,
    tags: post.tags.join(' '),
    body: post.body,
    hook: post.linkedin.hook,
    cta: post.linkedin.cta,
    status: post.status,
    type: post.type,
  }
}

export function indexAll(index: MiniSearch<IndexedPost>, posts: Post[]): void {
  index.removeAll()
  if (posts.length === 0) return
  index.addAll(posts.map(postToIndexed))
}

export function indexPost(index: MiniSearch<IndexedPost>, indexed: IndexedPost): void {
  if (index.has(indexed.id)) {
    index.replace(indexed)
    return
  }
  index.add(indexed)
}

export function deindexPost(index: MiniSearch<IndexedPost>, id: string): void {
  if (index.has(id)) index.discard(id)
}

export type PostSearchHit = SearchResult

export function searchPosts(
  index: MiniSearch<IndexedPost>,
  query: string,
  options?: { filter?: (hit: PostSearchHit) => boolean },
): PostSearchHit[] {
  const q = query.trim()
  if (!q) return []
  const raw = index.search(q)
  if (!options?.filter) return raw
  return raw.filter(options.filter)
}

export function highlight(text: string, query: string, max = 120): string {
  if (!text) return ''
  const q = query.trim()
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!q) return trimmed.slice(0, max)
  const lower = trimmed.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx < 0) return trimmed.slice(0, max)
  const start = Math.max(0, idx - Math.floor((max - q.length) / 2))
  const end = Math.min(trimmed.length, start + max)
  const slice = trimmed.slice(start, end)
  return (start > 0 ? '…' : '') + slice + (end < trimmed.length ? '…' : '')
}
