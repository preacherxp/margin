import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { resetMockData, listPosts } from '@/lib/tauri-bridge'
import { listBuiltInTemplates } from '@/lib/templates'

describe('posts store: createFromTemplate (mock mode)', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetMockData()
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()
  })

  it('creates a new post seeded from a built-in template', async () => {
    const posts = usePostsStore()
    await posts.refresh()
    const before = posts.items.length

    const built = listBuiltInTemplates()
    expect(built.length).toBeGreaterThan(0)
    const tpl = built[0]!
    const post = await posts.createFromTemplate({
      templateSlug: tpl.slug,
      title: 'My new post from template',
    })

    expect(post.title).toBe('My new post from template')
    expect(post.type).toBe(tpl.type)
    expect(post.template).toBe(tpl.slug)
    expect(post.tags).toEqual(tpl.tags)
    expect(post.linkedin.hashtags).toEqual(tpl.linkedin.hashtags)
    expect(post.body.length).toBeGreaterThan(0)
    expect(post.body).toContain(tpl.body.split('\n')[0] ?? '')

    const after = await listPosts('/mock/posts')
    expect(after.length).toBe(before + 1)
    const created = after.find((p) => p.id === post.id)
    expect(created).toBeDefined()
    expect(created?.title).toBe('My new post from template')
  })

  it('falls back to template name when title is empty', async () => {
    const posts = usePostsStore()
    await posts.refresh()
    const tpl = listBuiltInTemplates().find((t) => t.slug === 'linkedin-story')!
    const post = await posts.createFromTemplate({ templateSlug: tpl.slug, title: '   ' })
    expect(post.title).toBe(tpl.name)
  })

  it('lets the caller override the post type', async () => {
    const posts = usePostsStore()
    await posts.refresh()
    const tpl = listBuiltInTemplates().find((t) => t.slug === 'linkedin-story')!
    const post = await posts.createFromTemplate({
      templateSlug: tpl.slug,
      type: 'blog',
    })
    expect(post.type).toBe('blog')
  })

  it('produces a new ULID for each post', async () => {
    const posts = usePostsStore()
    await posts.refresh()
    const tpl = listBuiltInTemplates()[0]!
    const a = await posts.createFromTemplate({ templateSlug: tpl.slug, title: 'one' })
    const b = await posts.createFromTemplate({ templateSlug: tpl.slug, title: 'two' })
    expect(a.id).not.toBe(b.id)
  })

  it('seeds post body from template body', async () => {
    const posts = usePostsStore()
    await posts.refresh()
    const tpl = listBuiltInTemplates().find((t) => t.slug === 'blog-how-to')!
    const post = await posts.createFromTemplate({ templateSlug: tpl.slug, title: 'My how-to' })
    expect(post.body).toContain('Prerequisites')
    expect(post.body).toContain('Step 1')
  })

  it('throws when no posts folder is set', async () => {
    const settings = useSettingsStore()
    await settings.clearFolder()
    const posts = usePostsStore()
    await expect(posts.createFromTemplate({ templateSlug: 'linkedin-story' })).rejects.toThrow(
      /no posts folder/i,
    )
  })

  it('persists the post and re-reading yields the same body', async () => {
    const posts = usePostsStore()
    await posts.refresh()
    const tpl = listBuiltInTemplates().find((t) => t.slug === 'blog-essay')!
    const post = await posts.createFromTemplate({ templateSlug: tpl.slug, title: 'My essay' })
    await posts.open(post.path)
    expect(posts.current?.body).toBe(post.body)
  })
})
