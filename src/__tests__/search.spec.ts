import { describe, it, expect } from 'vitest'
import {
  createPostIndex,
  indexAll,
  indexPost,
  deindexPost,
  searchPosts,
  highlight,
} from '@/lib/search'
import { SAMPLE_POSTS } from '@/lib/mock-data'

function posts() {
  return SAMPLE_POSTS
}

describe('search index', () => {
  it('indexes all sample posts and finds by title', () => {
    const index = createPostIndex()
    indexAll(index, posts())
    const hits = searchPosts(index, 'prompt')
    expect(hits.length).toBeGreaterThan(0)
    const titles = hits.map((h) => h.title)
    expect(titles.some((t) => t.toLowerCase().includes('prompt'))).toBe(true)
  })

  it('boosts title matches over body matches', () => {
    const index = createPostIndex()
    indexAll(index, posts())
    const hits = searchPosts(index, 'side project')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.title.toLowerCase()).toContain('side project')
  })

  it('finds matches by tag', () => {
    const index = createPostIndex()
    indexAll(index, posts())
    const hits = searchPosts(index, 'hooks')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.id).toBe('01HXY1HOTAK0000000000000000')
  })

  it('supports prefix matching', () => {
    const index = createPostIndex()
    indexAll(index, posts())
    const hits = searchPosts(index, 'hook')
    expect(hits.length).toBeGreaterThan(0)
  })

  it('returns empty for empty query', () => {
    const index = createPostIndex()
    indexAll(index, posts())
    expect(searchPosts(index, '')).toEqual([])
    expect(searchPosts(index, '   ')).toEqual([])
  })

  it('adds, updates, and removes posts', () => {
    const index = createPostIndex()
    const original = posts()[0]
    if (!original) throw new Error('expected sample posts')
    indexPost(index, original)
    expect(searchPosts(index, 'completely').length).toBe(0)
    const edited: typeof original = { ...original, title: 'completely different title' }
    indexPost(index, edited)
    expect(searchPosts(index, 'completely').length).toBe(1)
    deindexPost(index, edited.id)
    expect(searchPosts(index, 'completely').length).toBe(0)
  })

  it('replaces all documents on indexAll', () => {
    const index = createPostIndex()
    const first = posts()[0]
    if (!first) throw new Error('expected sample posts')
    indexAll(index, [first])
    expect(searchPosts(index, 'prompt').length).toBe(0)
    indexAll(index, posts())
    expect(searchPosts(index, 'prompt').length).toBeGreaterThan(0)
  })

  it('honors custom filters', () => {
    const index = createPostIndex()
    indexAll(index, posts())
    const hits = searchPosts(index, 'post', { filter: (h) => h.status === 'published' })
    for (const h of hits) expect(h.status).toBe('published')
  })
})

describe('highlight', () => {
  it('returns trimmed text for empty query', () => {
    expect(highlight('  hello   world  ', '')).toBe('hello world')
  })

  it('centers the match in the snippet', () => {
    const text = 'a'.repeat(200) + 'NEEDLE' + 'b'.repeat(200)
    const out = highlight(text, 'needle', 60)
    expect(out).toContain('NEEDLE')
    expect(out.length).toBeLessThanOrEqual(62)
  })

  it('returns ellipsis-prefixed snippet when match is in the middle', () => {
    const text = 'aaaa bbbb cccc NEEDLE dddd'
    const out = highlight(text, 'needle', 20)
    expect(out.startsWith('…')).toBe(true)
  })
})
