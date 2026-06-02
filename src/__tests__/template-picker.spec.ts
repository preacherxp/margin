import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import TemplatePicker from '@/components/template/TemplatePicker.vue'
import { useSettingsStore } from '@/stores/settings'
import { resetMockData } from '@/lib/tauri-bridge'
import { BUILT_IN_TEMPLATE_SLUGS } from '@/lib/templates'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/post/:id', name: 'editor', component: { template: '<div />' } },
  ],
})

describe('TemplatePicker', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetModules()
    resetMockData()
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()
    router.push('/')
    await router.isReady()
  })

  it('lists all built-in templates by default', async () => {
    const wrapper = mount(TemplatePicker, {
      global: { plugins: [router] },
    })
    await flushPromises()
    await nextTick()
    const items = wrapper.findAll('[data-testid^="template-picker-item-"]')
    expect(items.length).toBe(BUILT_IN_TEMPLATE_SLUGS.length)
  })

  it('shows built-in badge on each item', async () => {
    const wrapper = mount(TemplatePicker, {
      global: { plugins: [router] },
    })
    await flushPromises()
    await nextTick()
    const badges = wrapper.findAll('.badge')
    expect(badges.length).toBeGreaterThan(0)
    expect(badges[0]!.text()).toBe('built-in')
  })

  it('filters by type', async () => {
    const wrapper = mount(TemplatePicker, {
      global: { plugins: [router] },
    })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="template-picker-filter-linkedin"]').trigger('click')
    await nextTick()
    const items = wrapper.findAll('[data-testid^="template-picker-item-"]')
    expect(items.length).toBe(3)
    for (const item of items) {
      expect(item.text()).toContain('linkedin')
    }
  })

  it('selects an item and updates the title', async () => {
    const wrapper = mount(TemplatePicker, {
      global: { plugins: [router] },
    })
    await flushPromises()
    await nextTick()
    const item = wrapper.get('[data-testid="template-picker-item-blog-essay"]')
    await item.trigger('click')
    await nextTick()
    const input = wrapper.get('[data-testid="template-picker-title"]').element as HTMLInputElement
    expect(input.value).toBe('Blog Essay')
  })

  it('emits used and navigates on submit', async () => {
    const used = vi.fn<(postId: string) => void>()
    const wrapper = mount(TemplatePicker, {
      global: { plugins: [router] },
      props: {
        onUsed: used,
      },
    })
    await flushPromises()
    await nextTick()
    const item = wrapper.get('[data-testid="template-picker-item-linkedin-story"]')
    await item.trigger('click')
    await nextTick()
    const input = wrapper.get('[data-testid="template-picker-title"]')
    await input.setValue('My new post')
    await wrapper.get('[data-testid="template-picker-use-btn"]').trigger('click')
    await flushPromises()
    expect(used).toHaveBeenCalledTimes(1)
    const postId = used.mock.calls[0]![0] as string
    expect(postId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })
})
