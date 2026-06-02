import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import Toaster from '@/components/shell/ToastStack.vue'
import { useToastsStore } from '@/stores/toasts'

describe('Toaster', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders the toaster host with no toast rows when empty', () => {
    mount(Toaster, { attachTo: document.body })
    expect(document.querySelector('[data-testid="toaster"]')).not.toBeNull()
    expect(document.querySelectorAll('[data-testid^="toast-"]')).toHaveLength(0)
  })

  it('renders a row for each toast with the right testid and kind', async () => {
    const toasts = useToastsStore()
    toasts.success('Saved')
    toasts.error('Boom')
    mount(Toaster, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('[data-testid="toast-success"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="toast-error"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Saved')
    expect(document.body.textContent).toContain('Boom')
  })

  it('dismisses a toast when the × button is clicked', async () => {
    const toasts = useToastsStore()
    toasts.push({ kind: 'info', message: 'click me', duration: 0 })
    mount(Toaster, { attachTo: document.body })
    await nextTick()
    expect(toasts.toasts).toHaveLength(1)
    const btn = document.querySelector<HTMLButtonElement>('[data-testid="toast-info-dismiss"]')
    expect(btn).not.toBeNull()
    btn?.click()
    expect(toasts.toasts).toHaveLength(0)
  })

  it('auto-dismisses a toast when its duration elapses', async () => {
    const toasts = useToastsStore()
    toasts.push({ kind: 'success', message: 'flash', duration: 500 })
    mount(Toaster, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('[data-testid="toast-success"]')).not.toBeNull()
    vi.advanceTimersByTime(600)
    await nextTick()
    expect(document.querySelector('[data-testid="toast-success"]')).toBeNull()
  })
})
