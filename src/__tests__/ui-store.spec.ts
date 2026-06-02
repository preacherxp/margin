import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '@/stores/ui'

describe('ui store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts closed with default filters', () => {
    const ui = useUiStore()
    expect(ui.paletteOpen).toBe(false)
    expect(ui.statusFilter).toBe('all')
    expect(ui.tagFilters).toEqual([])
    expect(ui.sortKey).toBe('updated')
    expect(ui.searchQuery).toBe('')
    expect(ui.hasActiveFilters).toBe(false)
  })

  it('toggles palette open and close', () => {
    const ui = useUiStore()
    ui.openPalette()
    expect(ui.paletteOpen).toBe(true)
    ui.closePalette()
    expect(ui.paletteOpen).toBe(false)
    ui.togglePalette()
    expect(ui.paletteOpen).toBe(true)
    ui.togglePalette()
    expect(ui.paletteOpen).toBe(false)
  })

  it('toggles tags additively', () => {
    const ui = useUiStore()
    ui.toggleTag('ai')
    expect(ui.tagFilters).toEqual(['ai'])
    ui.toggleTag('career')
    expect(ui.tagFilters).toEqual(['ai', 'career'])
    ui.toggleTag('ai')
    expect(ui.tagFilters).toEqual(['career'])
  })

  it('clears all filters', () => {
    const ui = useUiStore()
    ui.setStatus('published')
    ui.toggleTag('ai')
    ui.setSearch('hello')
    expect(ui.hasActiveFilters).toBe(true)
    ui.clearFilters()
    expect(ui.statusFilter).toBe('all')
    expect(ui.tagFilters).toEqual([])
    expect(ui.searchQuery).toBe('')
  })

  it('marks active filters when set', () => {
    const ui = useUiStore()
    ui.setStatus('draft')
    expect(ui.hasActiveFilters).toBe(true)
  })

  it('switches sort key', () => {
    const ui = useUiStore()
    ui.setSort('created')
    expect(ui.sortKey).toBe('created')
    ui.setSort('scheduled')
    expect(ui.sortKey).toBe('scheduled')
  })

  it('tracks preview id', () => {
    const ui = useUiStore()
    ui.setPreview('abc')
    expect(ui.previewId).toBe('abc')
    ui.setPreview(null)
    expect(ui.previewId).toBe(null)
  })
})
