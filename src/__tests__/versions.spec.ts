import { describe, it, expect } from 'vitest'
import {
  diffLines,
  diffPostBodies,
  diffRawContent,
  formatVersionTs,
  parseSnapshot,
  splitLines,
  summarizeDiff,
} from '@/lib/versions'
import type { Post } from '@/types/post'

function makePost(partial: Partial<Post>): Post {
  return {
    id: 'id',
    title: 'T',
    status: 'draft',
    type: 'linkedin',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    scheduledFor: null,
    publishedAt: null,
    tags: [],
    template: null,
    path: '/posts/x.md',
    linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
    assets: [],
    versions: 0,
    body: '',
    ...partial,
  }
}

describe('splitLines', () => {
  it('returns [] for empty input', () => {
    expect(splitLines('')).toEqual([])
  })

  it('keeps a single line as a single line', () => {
    expect(splitLines('hello')).toEqual(['hello'])
  })

  it('splits on \\n', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c'])
  })

  it('drops a trailing newline', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b'])
  })
})

describe('diffLines', () => {
  it('returns all-equal for identical inputs', () => {
    const lines = diffLines('a\nb\nc', 'a\nb\nc')
    expect(lines.every((l) => l.kind === 'eq')).toBe(true)
    expect(lines.map((l) => l.value)).toEqual(['a', 'b', 'c'])
  })

  it('flags pure additions', () => {
    const lines = diffLines('a', 'a\nb\nc')
    const adds = lines.filter((l) => l.kind === 'add').map((l) => l.value)
    expect(adds).toEqual(['b', 'c'])
  })

  it('flags pure deletions', () => {
    const lines = diffLines('a\nb\nc', 'a')
    const dels = lines.filter((l) => l.kind === 'del').map((l) => l.value)
    expect(dels).toEqual(['b', 'c'])
  })

  it('handles a substitution', () => {
    const lines = diffLines('a\nb\nc', 'a\nB\nc')
    const summary = summarizeDiff(lines)
    expect(summary.added).toBe(1)
    expect(summary.removed).toBe(1)
    expect(summary.unchanged).toBe(2)
  })

  it('preserves old/new line indices', () => {
    const lines = diffLines('a\nb\nc', 'a\nB\nc')
    const eq = lines.filter((l) => l.kind === 'eq')
    expect(eq[0]?.oldIndex).toBe(0)
    expect(eq[0]?.newIndex).toBe(0)
    const del = lines.find((l) => l.kind === 'del')
    expect(del?.oldIndex).toBe(1)
    expect(del?.newIndex).toBeNull()
    const add = lines.find((l) => l.kind === 'add')
    expect(add?.oldIndex).toBeNull()
    expect(add?.newIndex).toBe(1)
  })

  it('handles totally different content', () => {
    const lines = diffLines('a\nb', 'c\nd')
    const summary = summarizeDiff(lines)
    expect(summary.added).toBe(2)
    expect(summary.removed).toBe(2)
    expect(summary.unchanged).toBe(0)
  })
})

describe('summarizeDiff', () => {
  it('counts kinds', () => {
    const s = summarizeDiff([
      { kind: 'eq', value: 'a', oldIndex: 0, newIndex: 0 },
      { kind: 'add', value: 'b', oldIndex: null, newIndex: 1 },
      { kind: 'del', value: 'c', oldIndex: 1, newIndex: null },
    ])
    expect(s).toEqual({ added: 1, removed: 1, unchanged: 1 })
  })
})

describe('diffPostBodies', () => {
  it('uses only the body field', () => {
    const prev = makePost({ id: 'a', body: 'one\ntwo' })
    const next = makePost({ id: 'b', body: 'one\ntwo\nthree' })
    const { lines, summary } = diffPostBodies(prev, next)
    expect(summary.added).toBe(1)
    expect(summary.removed).toBe(0)
    const adds = lines.filter((l) => l.kind === 'add')
    expect(adds.every((l) => l.oldIndex === null)).toBe(true)
    const eqs = lines.filter((l) => l.kind === 'eq')
    expect(eqs.every((l) => l.oldIndex !== null && l.newIndex !== null)).toBe(true)
  })
})

describe('diffRawContent', () => {
  it('handles identical markdown with frontmatter', () => {
    const a = '---\nid: 1\n---\nhello'
    const b = '---\nid: 1\n---\nhello'
    const { summary } = diffRawContent(a, b)
    expect(summary.added).toBe(0)
    expect(summary.removed).toBe(0)
    expect(summary.unchanged).toBeGreaterThan(0)
  })

  it('flags a body edit through frontmatter', () => {
    const a = '---\nid: 1\n---\nold'
    const b = '---\nid: 1\n---\nnew'
    const { summary } = diffRawContent(a, b)
    expect(summary.added).toBe(1)
    expect(summary.removed).toBe(1)
  })
})

describe('formatVersionTs', () => {
  it('renders date + time without colons', () => {
    expect(formatVersionTs('2026-06-02T13-45-51.559Z')).toBe('2026-06-02 13:45:51Z')
  })

  it('passes short strings through', () => {
    expect(formatVersionTs('x')).toBe('x')
  })
})

describe('parseSnapshot', () => {
  it('parses a well-formed post file', () => {
    const content = `---
id: 01HXY1
title: A title
status: draft
type: linkedin
createdAt: 2026-06-01T00:00:00.000Z
updatedAt: 2026-06-01T00:00:00.000Z
scheduledFor: null
publishedAt: null
tags: [a, b]
template: null
path: /posts/x.md
linkedin:
  hook: hi
  cta: go
  hashtags: ["#x"]
  audience: devs
assets: []
versions: 4
---
body content
`
    const p = parseSnapshot(content, '/posts/x.md')
    expect(p).not.toBeNull()
    expect(p?.title).toBe('A title')
    expect(p?.versions).toBe(4)
    expect(p?.linkedin.hook).toBe('hi')
    expect(p?.tags).toEqual(['a', 'b'])
    expect(p?.body).toContain('body content')
  })

  it('returns null when frontmatter is malformed', () => {
    expect(parseSnapshot('no frontmatter at all', '')).toBeNull()
  })
})
