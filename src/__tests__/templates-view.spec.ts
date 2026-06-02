import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import TemplatesView from '@/views/TemplatesView.vue'
import TopBar from '@/components/shell/TopBar.vue'
import HomeView from '@/views/HomeView.vue'
import EditorView from '@/views/EditorView.vue'
import { useSettingsStore } from '@/stores/settings'
import { resetMockData } from '@/lib/tauri-bridge'
import { BUILT_IN_TEMPLATE_SLUGS } from '@/lib/templates'

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/templates', name: 'templates', component: TemplatesView },
      { path: '/post/:id', name: 'editor', component: EditorView },
    ],
  })
}

describe('templates routing & top bar', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetModules()
    resetMockData()
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()
  })

  it('TopBar shows nav links for Posts and Templates', async () => {
    const router = buildRouter()
    router.push('/')
    await router.isReady()
    const wrapper = mount(TopBar, { global: { plugins: [router] } })
    expect(wrapper.find('[data-testid="nav-home"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-templates"]').exists()).toBe(true)
  })

  it('TopBar highlights the active route', async () => {
    const router = buildRouter()
    router.push('/templates')
    await router.isReady()
    const wrapper = mount(TopBar, { global: { plugins: [router] } })
    const templatesLink = wrapper.get('[data-testid="nav-templates"]')
    expect(templatesLink.classes()).toContain('active')
  })

  it('navigates to /templates when the link is clicked', async () => {
    const router = buildRouter()
    router.push('/')
    await router.isReady()
    const wrapper = mount(TopBar, { global: { plugins: [router] } })
    await wrapper.get('[data-testid="nav-templates"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('templates')
  })

  it('TemplatesView renders all built-in templates when a folder is set', async () => {
    const router = buildRouter()
    router.push('/templates')
    await router.isReady()
    const wrapper = mount(TemplatesView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    const items = wrapper.findAll('[data-testid^="template-item-"]')
    expect(items.length).toBe(BUILT_IN_TEMPLATE_SLUGS.length)
  })

  it('TemplatesView shows the body preview after picking a template', async () => {
    const router = buildRouter()
    router.push('/templates')
    await router.isReady()
    const wrapper = mount(TemplatesView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="template-item-blog-how-to"]').trigger('click')
    await flushPromises()
    await nextTick()
    const preview = wrapper.get('[data-testid="template-preview-content"]')
    expect(preview.text()).toContain('Blog How-To')
    expect(preview.text()).toContain('Prerequisites')
  })

  it('TemplatesView filters by type', async () => {
    const router = buildRouter()
    router.push('/templates')
    await router.isReady()
    const wrapper = mount(TemplatesView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="templates-filter-blog"]').trigger('click')
    await nextTick()
    const items = wrapper.findAll('[data-testid^="template-item-"]')
    expect(items.length).toBe(2)
    for (const item of items) {
      expect(item.text()).toContain('blog')
    }
  })
})
