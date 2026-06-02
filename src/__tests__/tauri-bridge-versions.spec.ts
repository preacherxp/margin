import { describe, it, expect, beforeEach } from 'vitest'
import {
  deleteVersionsForPost,
  listVersions,
  readVersion,
  resetMockData,
  saveVersion,
} from '@/lib/tauri-bridge'

const POST_A = '01HXY1STORY0000000000000000'
const POST_B = '01HXY1LSTIC0000000000000000'

const CONTENT_V1 = `---
id: ${POST_A}
title: First version
status: draft
type: linkedin
createdAt: 2026-06-01T10:00:00.000Z
updatedAt: 2026-06-01T10:00:00.000Z
scheduledFor: null
publishedAt: null
tags: [a]
template: null
path: /mock/posts/x.md
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
assets: []
versions: 1
---
Hello world
`

const CONTENT_V2 = CONTENT_V1
  .replace('First version', 'Second version')
  .replace('Hello world', 'Hello there, friend')
  .replace('versions: 1', 'versions: 2')
  .replace('updatedAt: 2026-06-01T10:00:00.000Z', 'updatedAt: 2026-06-02T10:00:00.000Z')

describe('tauri-bridge versions (mock mode)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMockData()
  })

  it('listVersions returns [] when no versions are saved', async () => {
    const list = await listVersions(POST_A, '/mock/posts')
    expect(list).toEqual([])
  })

  it('saveVersion persists a version and listVersions returns it', async () => {
    const meta = await saveVersion(POST_A, '/mock/posts', CONTENT_V1)
    expect(meta.postId).toBe(POST_A)
    expect(meta.bytes).toBeGreaterThan(0)
    expect(meta.preview).toContain('Hello world')

    const list = await listVersions(POST_A, '/mock/posts')
    expect(list).toHaveLength(1)
    expect(list[0]?.ts).toBe(meta.ts)
  })

  it('readVersion returns the stored content with title and updatedAt', async () => {
    const meta = await saveVersion(POST_A, '/mock/posts', CONTENT_V2)
    const v = await readVersion(POST_A, meta.ts, '/mock/posts')
    expect(v.postId).toBe(POST_A)
    expect(v.ts).toBe(meta.ts)
    expect(v.content).toBe(CONTENT_V2)
    expect(v.title).toBe('Second version')
    expect(v.updatedAt).toBe('2026-06-02T10:00:00.000Z')
  })

  it('readVersion throws for an unknown version', async () => {
    await expect(readVersion(POST_A, '2099-01-01T00-00-00.000Z', '/mock/posts')).rejects.toThrow(
      /version not found/,
    )
  })

  it('listVersions returns newest first', async () => {
    const m1 = await saveVersion(POST_A, '/mock/posts', CONTENT_V1)
    await new Promise((r) => setTimeout(r, 5))
    const m2 = await saveVersion(POST_A, '/mock/posts', CONTENT_V2)
    expect(m2.ts > m1.ts).toBe(true)
    const list = await listVersions(POST_A, '/mock/posts')
    expect(list[0]?.ts).toBe(m2.ts)
    expect(list[1]?.ts).toBe(m1.ts)
  })

  it('versions are scoped per post', async () => {
    await saveVersion(POST_A, '/mock/posts', CONTENT_V1)
    await saveVersion(POST_B, '/mock/posts', CONTENT_V1.replace(POST_A, POST_B))
    expect(await listVersions(POST_A, '/mock/posts')).toHaveLength(1)
    expect(await listVersions(POST_B, '/mock/posts')).toHaveLength(1)
  })

  it('caps at MAX_VERSIONS_PER_POST (50) FIFO', async () => {
    for (let i = 0; i < 55; i++) {
      await saveVersion(POST_A, '/mock/posts', `${CONTENT_V1}\n<!-- v${i} -->`)
      await new Promise((r) => setTimeout(r, 1))
    }
    const list = await listVersions(POST_A, '/mock/posts')
    expect(list).toHaveLength(50)
  }, 10000)

  it('deleteVersionsForPost removes everything for one post', async () => {
    await saveVersion(POST_A, '/mock/posts', CONTENT_V1)
    await saveVersion(POST_B, '/mock/posts', CONTENT_V1.replace(POST_A, POST_B))
    await deleteVersionsForPost(POST_A, '/mock/posts')
    expect(await listVersions(POST_A, '/mock/posts')).toEqual([])
    expect(await listVersions(POST_B, '/mock/posts')).toHaveLength(1)
  })

  it('resetMockData clears versions too', async () => {
    await saveVersion(POST_A, '/mock/posts', CONTENT_V1)
    resetMockData()
    expect(await listVersions(POST_A, '/mock/posts')).toEqual([])
  })
})
