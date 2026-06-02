import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { resetMockData } from '@/lib/tauri-bridge'

describe('home filtering & sorting', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetMockData()
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
  })

  function applyFilters() {
    const ui = useUiStore()
    const posts = usePostsStore()
    const q = ui.searchQuery.trim().toLowerCase()
    const status = ui.statusFilter
    const tags = ui.tagFilters

    let out = posts.items
    if (status !== 'all') out = out.filter((p) => p.status === status)
    if (tags.length > 0) out = out.filter((p) => tags.every((t) => p.tags.includes(t)))
    if (q) {
      out = out.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    const sorted = [...out]
    sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return sorted
  }

  it('filters by status', () => {
    const ui = useUiStore()
    const posts = usePostsStore()
    ui.setStatus('published')
    const result = applyFilters()
    for (const p of result) expect(p.status).toBe('published')
    expect(result.length).toBe(posts.byStatus.published)
  })

  it('filters by tag intersection', () => {
    const ui = useUiStore()
    const posts = usePostsStore()
    ui.toggleTag('ai')
    const result = applyFilters()
    for (const p of result) expect(p.tags).toContain('ai')
    expect(result.length).toBeLessThanOrEqual(posts.items.length)
  })

  it('combines status + tag filters', () => {
    const ui = useUiStore()
    ui.setStatus('draft')
    ui.toggleTag('career')
    const result = applyFilters()
    for (const p of result) {
      expect(p.status).toBe('draft')
      expect(p.tags).toContain('career')
    }
  })

  it('searches by title fragment', () => {
    const ui = useUiStore()
    ui.setSearch('prompt')
    const result = applyFilters()
    for (const p of result) {
      const inTitle = p.title.toLowerCase().includes('prompt')
      const inTag = p.tags.some((t) => t.toLowerCase().includes('prompt'))
      expect(inTitle || inTag).toBe(true)
    }
  })

  it('reports no active filters when defaults are set', () => {
    const ui = useUiStore()
    expect(ui.hasActiveFilters).toBe(false)
  })

  it('reports active filters when set', () => {
    const ui = useUiStore()
    ui.setStatus('draft')
    expect(ui.hasActiveFilters).toBe(true)
  })
})
