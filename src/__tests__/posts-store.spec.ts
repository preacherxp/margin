import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { listVersions, resetMockData } from '@/lib/tauri-bridge'

describe('posts store (mock mode)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetMockData()
  })

  it('seeds with sample posts on first refresh', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    expect(posts.items.length).toBeGreaterThanOrEqual(4)
  })

  it('creates a new draft and refreshes the list', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    const before = posts.items.length
    const post = await posts.create({ title: 'A new draft', type: 'linkedin' })
    expect(post.title).toBe('A new draft')
    expect(post.status).toBe('draft')
    expect(posts.items.length).toBe(before + 1)
    expect(posts.items[0]?.title).toBe('A new draft')
  })

  it('removes a post and clears current if open', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    const target = posts.items[0]
    if (!target) throw new Error('expected seed posts')
    await posts.open(target.path)
    expect(posts.current?.path).toBe(target.path)
    await posts.remove(target.path)
    expect(posts.current).toBeNull()
    expect(posts.items.find((p) => p.path === target.path)).toBeUndefined()
  })

  it('saves a post by round-tripping frontmatter', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    const target = posts.items[0]
    if (!target) throw new Error('expected seed posts')
    await posts.open(target.path)
    if (!posts.current) throw new Error('expected current post')
    const original = posts.current
    const edited = { ...original, title: 'Edited title' }
    await posts.save(edited)
    expect(posts.current?.title).toBe('Edited title')
    await posts.open(original.path)
    expect(posts.current?.title).toBe('Edited title')
  })

  it('increments versions on each save', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    const target = posts.items[0]
    if (!target) throw new Error('expected seed posts')
    await posts.open(target.path)
    if (!posts.current) throw new Error('expected current post')
    const start = posts.current.versions
    await posts.save({ ...posts.current, title: 'a' })
    expect(posts.current?.versions).toBe(start + 1)
    await posts.save({ ...posts.current, title: 'b' })
    expect(posts.current?.versions).toBe(start + 2)
  })

  it('save() snapshots the previous content into version history', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    const target = posts.items[0]
    if (!target) throw new Error('expected seed posts')
    await posts.open(target.path)
    if (!posts.current) throw new Error('expected current post')
    const id = posts.current.id

    const initial = await listVersions(id, settings.postsFolder!)
    expect(initial).toHaveLength(0)

    await posts.save({ ...posts.current, title: 'change-1' })
    const after1 = await listVersions(id, settings.postsFolder!)
    expect(after1).toHaveLength(1)

    await posts.save({ ...posts.current, title: 'change-2' })
    const after2 = await listVersions(id, settings.postsFolder!)
    expect(after2).toHaveLength(2)
  })

  it('save({ snapshot: false }) writes the file but does not snapshot or bump versions', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    const target = posts.items[0]
    if (!target) throw new Error('expected seed posts')
    await posts.open(target.path)
    if (!posts.current) throw new Error('expected current post')
    const id = posts.current.id
    const startVersions = posts.current.versions

    expect(await listVersions(id, settings.postsFolder!)).toHaveLength(0)

    await posts.save({ ...posts.current, title: 'no-snapshot-1' }, { snapshot: false })
    expect(posts.current?.title).toBe('no-snapshot-1')
    expect(posts.current?.versions).toBe(startVersions)
    expect(await listVersions(id, settings.postsFolder!)).toHaveLength(0)

    await posts.save({ ...posts.current, title: 'no-snapshot-2' }, { snapshot: false })
    expect(posts.current?.versions).toBe(startVersions)
    expect(await listVersions(id, settings.postsFolder!)).toHaveLength(0)

    await posts.save({ ...posts.current, title: 'snapshot-now' })
    expect(posts.current?.versions).toBe(startVersions + 1)
    expect(await listVersions(id, settings.postsFolder!)).toHaveLength(1)
  })

  it('remove() cleans up versions for the post', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    const target = posts.items[0]
    if (!target) throw new Error('expected seed posts')
    await posts.open(target.path)
    if (!posts.current) throw new Error('expected current post')
    const id = posts.current.id
    await posts.save({ ...posts.current, title: 'something' })
    expect(await listVersions(id, settings.postsFolder!)).toHaveLength(1)
    await posts.remove(target.path)
    expect(await listVersions(id, settings.postsFolder!)).toHaveLength(0)
  })
})
