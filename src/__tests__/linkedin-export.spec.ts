import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import LinkedinExport from '@/components/editor/LinkedinExport.vue'
import type { Post } from '@/types/post'

function makePost(overrides: Partial<Post> = {}): Post {
  const base: Post = {
    id: '01HXY',
    title: 'Sample',
    status: 'draft',
    type: 'linkedin',
    createdAt: '2026-06-02T10:00:00.000Z',
    updatedAt: '2026-06-02T10:00:00.000Z',
    scheduledFor: null,
    publishedAt: null,
    tags: [],
    template: null,
    path: '/posts/sample.md',
    linkedin: {
      hook: 'A short hook.',
      cta: 'Tell me more.',
      hashtags: ['#ai', '#career'],
      audience: '',
    },
    assets: [],
    versions: 0,
    body: 'Body line one.\n\nBody line two.',
  }
  return {
    ...base,
    ...overrides,
    linkedin: { ...base.linkedin, ...overrides.linkedin },
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
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

describe('LinkedinExport', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the char count pill on the trigger button', () => {
    const wrapper = mount(LinkedinExport, { props: { post: makePost() } })
    const btn = wrapper.get('[data-testid="linkedin-export-btn"]')
    expect(btn.text()).toContain('LinkedIn')
    expect(btn.text()).toMatch(/\d+\s*\/\s*3000/)
  })

  it('hides the pill when there is no content', () => {
    const post = makePost({
      body: '',
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
    })
    const wrapper = mount(LinkedinExport, { props: { post } })
    expect(wrapper.find('[data-testid="linkedin-char-count"]').exists()).toBe(false)
  })

  it('opens the popover on click and renders the formatted preview', async () => {
    const wrapper = mount(LinkedinExport, { props: { post: makePost() } })
    await wrapper.get('[data-testid="linkedin-export-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="linkedin-export-popover"]').exists()).toBe(true)
    const ta = wrapper.get('[data-testid="linkedin-export-text"]')
    const text = (ta.element as HTMLTextAreaElement).value
    expect(text).toContain('A short hook.')
    expect(text).toContain('Body line one.')
    expect(text).toContain('Tell me more.')
    expect(text).toContain('#ai')
    expect(text).toContain('#career')
  })

  it('shows overlimit state when chars exceed LinkedIn limit', () => {
    const big = 'x'.repeat(3100)
    const post = makePost({
      body: big,
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
    })
    const wrapper = mount(LinkedinExport, { props: { post } })
    const pill = wrapper.get('[data-testid="linkedin-char-count"]')
    expect(pill.attributes('data-tone')).toBe('over')
  })

  it('warns tone when chars are 90% of limit', () => {
    const almost = 'x'.repeat(2800)
    const post = makePost({
      body: almost,
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
    })
    const wrapper = mount(LinkedinExport, { props: { post } })
    const pill = wrapper.get('[data-testid="linkedin-char-count"]')
    expect(pill.attributes('data-tone')).toBe('warn')
  })

  it('copies the formatted text to clipboard and shows feedback', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    })

    const wrapper = mount(LinkedinExport, { props: { post: makePost() } })
    await wrapper.get('[data-testid="linkedin-export-btn"]').trigger('click')
    await wrapper.get('[data-testid="linkedin-export-copy-btn"]').trigger('click')
    await nextTick()

    expect(writeText).toHaveBeenCalledTimes(1)
    const arg = writeText.mock.calls[0]?.[0] as string
    expect(arg).toContain('A short hook.')
    expect(arg).toContain('Body line one.')
    expect(arg).toContain('Tell me more.')
    expect(arg).toContain('#ai #career')

    const copyBtn = wrapper.get('[data-testid="linkedin-export-copy-btn"]')
    expect(copyBtn.attributes('data-state')).toBe('copied')
    expect(copyBtn.text()).toContain('Copied')
  })

  it('falls back to execCommand when clipboard API is unavailable', async () => {
    const original = (navigator as Navigator & { clipboard?: unknown }).clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    const exec = vi.fn<() => boolean>(() => true)
    const originalExec = document.execCommand
    document.execCommand = exec

    try {
      const wrapper = mount(LinkedinExport, { props: { post: makePost() } })
      await wrapper.get('[data-testid="linkedin-export-btn"]').trigger('click')
      await wrapper.get('[data-testid="linkedin-export-copy-btn"]').trigger('click')
      await nextTick()
      expect(exec).toHaveBeenCalledWith('copy')
      const copyBtn = wrapper.get('[data-testid="linkedin-export-copy-btn"]')
      expect(copyBtn.attributes('data-state')).toBe('copied')
    } finally {
      document.execCommand = originalExec
      if (original !== undefined) {
        Object.defineProperty(navigator, 'clipboard', {
          value: original,
          configurable: true,
          writable: true,
        })
      }
    }
  })

  it('closes the popover when clicking the close button', async () => {
    const wrapper = mount(LinkedinExport, { props: { post: makePost() } })
    await wrapper.get('[data-testid="linkedin-export-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="linkedin-export-popover"]').exists()).toBe(true)
    await wrapper.get('[data-testid="linkedin-export-close"]').trigger('click')
    expect(wrapper.find('[data-testid="linkedin-export-popover"]').exists()).toBe(false)
  })

  it('closes the popover on Escape', async () => {
    const wrapper = mount(LinkedinExport, { props: { post: makePost() } })
    await wrapper.get('[data-testid="linkedin-export-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="linkedin-export-popover"]').exists()).toBe(true)
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    document.dispatchEvent(ev)
    await nextTick()
    expect(wrapper.find('[data-testid="linkedin-export-popover"]').exists()).toBe(false)
  })

  it('updates preview text reactively when post changes', async () => {
    const wrapper = mount(LinkedinExport, { props: { post: makePost() } })
    await wrapper.get('[data-testid="linkedin-export-btn"]').trigger('click')
    const initial = (
      wrapper.get('[data-testid="linkedin-export-text"]').element as HTMLTextAreaElement
    ).value
    expect(initial).toContain('A short hook.')

    await wrapper.setProps({
      post: makePost({
        body: 'Different body.',
        linkedin: { hook: 'New hook.', cta: '', hashtags: ['#x'], audience: '' },
      }),
    })
    const next = (
      wrapper.get('[data-testid="linkedin-export-text"]').element as HTMLTextAreaElement
    ).value
    expect(next).toContain('New hook.')
    expect(next).toContain('Different body.')
    expect(next).toContain('#x')
  })

  it('disables copy button when there is no content', async () => {
    const post = makePost({
      body: '',
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
    })
    const wrapper = mount(LinkedinExport, { props: { post } })
    await wrapper.get('[data-testid="linkedin-export-btn"]').trigger('click')
    const btn = wrapper.get('[data-testid="linkedin-export-copy-btn"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })
})
