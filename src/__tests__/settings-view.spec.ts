import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SettingsView from '@/views/SettingsView.vue'
import { useSettingsStore } from '@/stores/settings'
import { resetMockData } from '@/lib/tauri-bridge'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})

describe('SettingsView', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetModules()
    resetMockData()
    router.push('/settings')
    await router.isReady()
  })

  it('shows no folder when settings are empty', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    const folder = wrapper.get('[data-testid="settings-folder-value"]').text()
    expect(folder).toContain('No folder selected')
  })

  it('renders three theme options with the current one selected', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    const dark = wrapper.get('[data-testid="settings-theme-dark"]')
    const light = wrapper.get('[data-testid="settings-theme-light"]')
    const system = wrapper.get('[data-testid="settings-theme-system"]')
    expect(dark.attributes('aria-checked')).toBe('true')
    expect(light.attributes('aria-checked')).toBe('false')
    expect(system.attributes('aria-checked')).toBe('false')
  })

  it('switches theme and persists it', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="settings-theme-light"]').trigger('click')
    await flushPromises()
    await nextTick()

    const light = wrapper.get('[data-testid="settings-theme-light"]')
    expect(light.attributes('aria-checked')).toBe('true')

    const stored = JSON.parse(localStorage.getItem('margin:settings') ?? '{}')
    expect(stored.theme).toBe('light')
  })

  it('choosing a folder shows the new path and clears the pick spinner', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    const choose = wrapper.get('[data-testid="settings-choose-folder-btn"]')
    await choose.trigger('click')
    await flushPromises()
    await nextTick()
    const folder = wrapper.get('[data-testid="settings-folder-value"]').text()
    expect(folder).toContain('/mock/posts')
    expect(choose.attributes('disabled')).toBeUndefined()
  })

  it('clear button removes the saved folder', async () => {
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()
    const wrapper = mount(SettingsView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    const clear = wrapper.get('[data-testid="settings-clear-folder-btn"]')
    await clear.trigger('click')
    await flushPromises()
    await nextTick()
    expect(settings.postsFolder).toBeNull()
  })
})
