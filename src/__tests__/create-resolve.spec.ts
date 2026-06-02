import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { resetMockData } from '@/lib/tauri-bridge'

describe('create -> resolve by id', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetMockData()
  })

  it('creates a post and the new id is resolvable from items', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()

    const post = await posts.create({ title: 'Slash test', type: 'linkedin' })
    expect(post.path).toContain('/')

    const found = posts.items.find((p) => p.id === post.id)
    expect(found).toBeDefined()
    expect(found?.path).toBe(post.path)
  })

  it('can open a freshly created post by resolving its id then path', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()

    const post = await posts.create({ title: 'Round trip', type: 'blog' })
    const meta = posts.items.find((p) => p.id === post.id)
    expect(meta).toBeDefined()
    if (!meta) throw new Error('missing meta')

    await posts.open(meta.path)
    expect(posts.current?.id).toBe(post.id)
    expect(posts.current?.title).toBe('Round trip')
  })
})
