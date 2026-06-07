import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import HomeView from '../views/HomeView.vue'

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: HomeView }],
  })
}

describe('App shell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders the top bar with brand and env label', async () => {
    const router = buildRouter()
    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Margin')
    expect(wrapper.text()).toContain('env')
  })

  it('does not crash when window.__TAURI_INTERNALS__ is missing', () => {
    vi.stubGlobal('window', { ...globalThis.window })
    const router = buildRouter()
    router.push('/')
    return router.isReady().then(() => {
      const wrapper = mount(App, { global: { plugins: [router] } })
      expect(wrapper.exists()).toBe(true)
    })
  })

  it('applies the saved theme to <html> on mount', async () => {
    localStorage.setItem('margin:settings', JSON.stringify({ postsFolder: null, theme: 'light' }))
    const router = buildRouter()
    router.push('/')
    await router.isReady()
    mount(App, { global: { plugins: [router] } })
    await new Promise((r) => setTimeout(r, 0))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
