import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import VersionDrawer from '@/components/editor/VersionDrawer.vue'
import { useSettingsStore } from '@/stores/settings'
import { usePostsStore } from '@/stores/posts'
import { resetMockData } from '@/lib/tauri-bridge'
import type { Post } from '@/types/post'

const POST: Post = {
  id: 'post-1',
  title: 'Drawer test',
  status: 'draft',
  type: 'linkedin',
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-02T10:00:00.000Z',
  scheduledFor: null,
  publishedAt: null,
  tags: ['a'],
  template: null,
  path: '/mock/posts/post-1.md',
  linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
  assets: [],
  versions: 2,
  body: 'current body line 1\ncurrent body line 2',
}

function buildPostFrontmatter(body: string, title: string, updatedAt: string): string {
  return `---
id: post-1
title: ${title}
status: draft
type: linkedin
createdAt: 2026-06-01T10:00:00.000Z
updatedAt: ${updatedAt}
scheduledFor: null
publishedAt: null
tags: []
template: null
path: /mock/posts/post-1.md
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
assets: []
versions: 1
---
${body}
`
}

async function mountDrawer(props: { open: boolean; post: Post | null }) {
  return mount(VersionDrawer, { props, attachTo: document.body })
}

describe('VersionDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetMockData()
  })

  it('does not render when open is false', async () => {
    const wrapper = await mountDrawer({ open: false, post: POST })
    expect(document.querySelector('[data-testid="version-drawer"]')).toBeNull()
    wrapper.unmount()
  })

  it('renders empty state when there are no versions', async () => {
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()

    const wrapper = await mountDrawer({ open: true, post: POST })
    await flushPromises()
    expect(document.querySelector('[data-testid="version-drawer"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="version-empty"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('lists saved versions in the timeline', async () => {
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()
    const { saveVersion } = await import('@/lib/tauri-bridge')
    await saveVersion(
      POST.id,
      settings.postsFolder!,
      buildPostFrontmatter('older body', 'Older', '2026-06-01T11:00:00.000Z'),
    )
    await new Promise((r) => setTimeout(r, 5))
    await saveVersion(
      POST.id,
      settings.postsFolder!,
      buildPostFrontmatter('newer body', 'Newer', '2026-06-01T12:00:00.000Z'),
    )

    const wrapper = await mountDrawer({ open: true, post: POST })
    await flushPromises()
    const items = document.querySelectorAll('[data-testid^="version-item-"]')
    expect(items.length).toBe(2)
    wrapper.unmount()
  })

  it('emits close on Escape', async () => {
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()
    const wrapper = await mountDrawer({ open: true, post: POST })
    await flushPromises()
    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('renders diff with deltas when a version is selected', async () => {
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()
    const { saveVersion } = await import('@/lib/tauri-bridge')
    await saveVersion(
      POST.id,
      settings.postsFolder!,
      buildPostFrontmatter(
        'current body line 1\nolder line 2',
        'Drawer test',
        '2026-06-01T11:00:00.000Z',
      ),
    )

    const wrapper = await mountDrawer({ open: true, post: POST })
    await flushPromises()

    const table = document.querySelector('[data-testid="version-diff-table"]')
    expect(table).not.toBeNull()
    const lines = document.querySelectorAll('[data-testid^="version-diff-line-"]')
    expect(lines.length).toBeGreaterThan(0)
    const dels = document.querySelectorAll('[data-kind="del"]')
    const adds = document.querySelectorAll('[data-kind="add"]')
    expect(dels.length + adds.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('restore calls posts.save with the snapshot content', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    const { saveVersion } = await import('@/lib/tauri-bridge')
    const oldContent = buildPostFrontmatter(
      'restored body\n',
      'Restored title',
      '2026-06-01T11:00:00.000Z',
    )
    await saveVersion(POST.id, settings.postsFolder!, oldContent)

    posts.$patch({ current: { ...POST, body: 'current body' } })

    const wrapper = await mountDrawer({ open: true, post: POST })
    await flushPromises()

    const restoreBtn = document.querySelector<HTMLButtonElement>(
      '[data-testid="version-restore-btn"]',
    )
    expect(restoreBtn).not.toBeNull()
    const saveSpy = vi.spyOn(posts, 'save')
    restoreBtn?.click()
    await flushPromises()
    expect(saveSpy).toHaveBeenCalled()
    const arg = saveSpy.mock.calls[0]?.[0]
    expect(arg?.title).toBe('Restored title')
    expect(arg?.body).toContain('restored body')
    wrapper.unmount()
    saveSpy.mockRestore()
  })
})
