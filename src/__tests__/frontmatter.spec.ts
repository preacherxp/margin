import { describe, it, expect } from 'vitest'
import { parseFrontmatter, serializeFrontmatter } from '@/lib/frontmatter'
import type { Post } from '@/types/post'

const SAMPLE: Post = {
  id: '01HXY',
  title: 'Hello world',
  status: 'draft',
  type: 'linkedin',
  createdAt: '2026-06-02T10:00:00.000Z',
  updatedAt: '2026-06-02T10:00:00.000Z',
  scheduledFor: null,
  publishedAt: null,
  tags: ['career', 'ai'],
  template: 'linkedin-story',
  path: '/posts/2026-06-02-hello.md',
  linkedin: {
    hook: 'A short hook.',
    cta: 'What do you think?',
    hashtags: ['#ai', '#career'],
    audience: 'engineers',
  },
  assets: [],
  versions: 0,
  body: '# Heading\n\nSome body text.\n',
}

describe('frontmatter', () => {
  it('parses valid frontmatter', () => {
    const content = serializeFrontmatter(SAMPLE)
    const parsed = parseFrontmatter(content, SAMPLE.path)
    expect(parsed.meta.id).toBe(SAMPLE.id)
    expect(parsed.meta.title).toBe('Hello world')
    expect(parsed.meta.tags).toEqual(['career', 'ai'])
    expect(parsed.linkedin.hook).toBe('A short hook.')
    expect(parsed.linkedin.hashtags).toEqual(['#ai', '#career'])
    expect(parsed.body).toContain('# Heading')
  })

  it('round-trips body content unchanged', () => {
    const content = serializeFrontmatter(SAMPLE)
    const parsed = parseFrontmatter(content, SAMPLE.path)
    expect(parsed.body).toBe(SAMPLE.body.trim())
  })

  it('throws on missing delimiter', () => {
    expect(() => parseFrontmatter('not frontmatter', '/x')).toThrow(/missing frontmatter/)
  })

  it('throws on unterminated frontmatter', () => {
    expect(() => parseFrontmatter('---\nfoo: 1\n', '/x')).toThrow(/unterminated/)
  })

  it('falls back to safe defaults for missing fields', () => {
    const content = `---\nid: abc\n---\nbody`
    const parsed = parseFrontmatter(content, '/x')
    expect(parsed.meta.status).toBe('draft')
    expect(parsed.meta.type).toBe('linkedin')
    expect(parsed.meta.tags).toEqual([])
    expect(parsed.linkedin.hook).toBe('')
    expect(parsed.versions).toBe(0)
  })
})
