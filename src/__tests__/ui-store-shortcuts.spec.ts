import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '@/stores/ui'

describe('ui store shortcuts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with shortcuts closed', () => {
    const ui = useUiStore()
    expect(ui.shortcutsOpen).toBe(false)
  })

  it('openShortcuts / closeShortcuts / toggleShortcuts', () => {
    const ui = useUiStore()
    ui.openShortcuts()
    expect(ui.shortcutsOpen).toBe(true)
    ui.closeShortcuts()
    expect(ui.shortcutsOpen).toBe(false)
    ui.toggleShortcuts()
    expect(ui.shortcutsOpen).toBe(true)
    ui.toggleShortcuts()
    expect(ui.shortcutsOpen).toBe(false)
  })
})
