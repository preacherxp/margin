import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { nextTick } from 'vue'

vi.mock('@/lib/tauri-bridge', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tauri-bridge')>(
    '@/lib/tauri-bridge',
  )
  return {
    ...actual,
    printActiveWindow: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  }
})

import EditorView from '@/views/EditorView.vue'
import HomeView from '@/views/HomeView.vue'
import { useSettingsStore } from '@/stores/settings'
import { usePostsStore } from '@/stores/posts'
import { resetMockData, printActiveWindow } from '@/lib/tauri-bridge'

const mockedPrint = vi.mocked(printActiveWindow)

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/post/:id', name: 'editor', component: EditorView, props: true },
    ],
  })
}

async function bootstrap(): Promise<{ router: Router; postId: string }> {
  const settings = useSettingsStore()
  const posts = usePostsStore()
  await settings.init()
  await settings.chooseFolder()
  await posts.refresh()

  const post = await posts.create({ title: 'Print me please', type: 'linkedin' })
  const saved = {
    ...post,
    body: 'A printable paragraph.',
    linkedin: {
      hook: 'A scroll-stopping hook.',
      cta: '',
      hashtags: ['#print', '#test'],
      audience: '',
    },
    tags: ['demo'],
  }
  await posts.save(saved)

  const router = buildRouter()
  router.push({ name: 'editor', params: { id: post.id } })
  await router.isReady()
  return { router, postId: post.id }
}

describe('EditorView print integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetMockData()
    mockedPrint.mockReset()
    mockedPrint.mockResolvedValue(undefined)
    if (typeof document !== 'undefined' && typeof document.elementFromPoint !== 'function') {
      document.elementFromPoint = () => null
    }
    if (
      typeof HTMLElement !== 'undefined' &&
      typeof HTMLElement.prototype.scrollIntoView !== 'function'
    ) {
      HTMLElement.prototype.scrollIntoView = function () {}
    }
  })

  it('mounts a PDF/print button inside the editor bar', async () => {
    const { router } = await bootstrap()
    const wrapper = mount(EditorView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="print-export-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="print-export-btn"]').exists()).toBe(true)
  })

  it('renders a print-only header with title, type, status, and date', async () => {
    const { router } = await bootstrap()
    const wrapper = mount(EditorView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    const header = wrapper.get('[data-testid="print-header"]')
    expect(header.text()).toContain('Print me please')
    expect(header.text()).toContain('linkedin')
    expect(header.text()).toContain('draft')
    expect(header.text()).toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('lists hashtags in the print header for linkedin posts', async () => {
    const { router } = await bootstrap()
    const wrapper = mount(EditorView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    const tags = wrapper.get('[data-testid="print-tags"]')
    expect(tags.text()).toContain('print')
    expect(tags.text()).toContain('test')
  })

  it('shows the linkedin hook in the print header when present', async () => {
    const { router } = await bootstrap()
    const wrapper = mount(EditorView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    const hook = wrapper.get('[data-testid="print-hook"]')
    expect(hook.text()).toContain('A scroll-stopping hook.')
  })

  it('clicking the PDF button routes through the native print bridge', async () => {
    const { router } = await bootstrap()
    const wrapper = mount(EditorView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="print-export-btn"]').trigger('click')
    await flushPromises()
    expect(mockedPrint).toHaveBeenCalledTimes(1)
    // and shows a success status inline
    const status = wrapper.get('[data-testid="print-export-status"]')
    expect(status.text()).toContain('Print dialog opened')
  })

  it('surfaces bridge errors in the inline status', async () => {
    mockedPrint.mockRejectedValueOnce(new Error('print panel unavailable'))
    const { router } = await bootstrap()
    const wrapper = mount(EditorView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="print-export-btn"]').trigger('click')
    await flushPromises()
    const status = wrapper.get('[data-testid="print-export-status"]')
    expect(status.attributes('data-state')).toBe('error')
    expect(status.text()).toContain('Print failed')
    expect(status.text()).toContain('print panel unavailable')
  })

  it('omits the linkedin hook block when the hook is empty', async () => {
    const settings = useSettingsStore()
    const posts = usePostsStore()
    await settings.init()
    await settings.chooseFolder()
    await posts.refresh()
    const blog = await posts.create({ title: 'Blog only', type: 'blog' })
    await posts.save({ ...blog, body: '# Heading\n\nbody' })

    const router = buildRouter()
    router.push({ name: 'editor', params: { id: blog.id } })
    await router.isReady()

    const wrapper = mount(EditorView, { global: { plugins: [router] } })
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="print-hook"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="print-tags"]').exists()).toBe(false)
  })
})
