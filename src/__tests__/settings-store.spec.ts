import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import * as bridge from '@/lib/tauri-bridge'

describe('settings store (mock mode)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('starts with default settings', () => {
    const settings = useSettingsStore()
    expect(settings.postsFolder).toBeNull()
    expect(settings.theme).toBe('dark')
  })

  it('initializes from mock storage', async () => {
    localStorage.setItem(
      'margin:settings',
      JSON.stringify({ postsFolder: '/some/where', theme: 'light' }),
    )
    const settings = useSettingsStore()
    await settings.init()
    expect(settings.postsFolder).toBe('/some/where')
    expect(settings.theme).toBe('light')
  })

  it('clears the folder on clearFolder', async () => {
    localStorage.setItem('margin:settings', JSON.stringify({ postsFolder: '/x', theme: 'dark' }))
    const settings = useSettingsStore()
    await settings.init()
    await settings.clearFolder()
    expect(settings.postsFolder).toBeNull()
  })

  it('setTheme persists the new theme and updates the store', async () => {
    const settings = useSettingsStore()
    await settings.init()
    await settings.setTheme('light')
    expect(settings.theme).toBe('light')
    const stored = JSON.parse(localStorage.getItem('margin:settings') ?? '{}')
    expect(stored.theme).toBe('light')
  })

  it('chooseFolder returns null without persisting when the picker is cancelled', async () => {
    const spy = vi.spyOn(bridge, 'pickFolder').mockResolvedValueOnce(null)
    const settings = useSettingsStore()
    await settings.init()
    const before = settings.postsFolder
    const after = await settings.chooseFolder()
    expect(spy).toHaveBeenCalled()
    expect(after).toBeNull()
    expect(settings.postsFolder).toBe(before)
  })
})
