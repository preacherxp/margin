import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useUiStore } from '@/stores/ui'
import { usePostsStore } from '@/stores/posts'
import { useToastsStore } from '@/stores/toasts'
import { useSettingsStore } from '@/stores/settings'
import { startGlobalShortcuts } from '@/lib/useGlobalShortcuts'
import { resetMockData } from '@/lib/tauri-bridge'

function fireKey(
  target: EventTarget,
  opts: { key: string; meta?: boolean; ctrl?: boolean; shift?: boolean },
) {
  const event = new KeyboardEvent('keydown', {
    key: opts.key,
    metaKey: opts.meta ?? false,
    ctrlKey: opts.ctrl ?? false,
    shiftKey: opts.shift ?? false,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
}

describe('useGlobalShortcuts', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetMockData()
    const settings = useSettingsStore()
    await settings.init()
    await settings.chooseFolder()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('toggles the command palette on ⌘K', () => {
    const detach = startGlobalShortcuts()
    try {
      const ui = useUiStore()
      expect(ui.paletteOpen).toBe(false)
      fireKey(window, { key: 'k', meta: true })
      expect(ui.paletteOpen).toBe(true)
      fireKey(window, { key: 'k', meta: true })
      expect(ui.paletteOpen).toBe(false)
    } finally {
      detach()
    }
  })

  it('does not register in-window shortcuts as Ctrl fallbacks', () => {
    const detach = startGlobalShortcuts()
    try {
      const ui = useUiStore()
      fireKey(window, { key: 'k', ctrl: true })
      expect(ui.paletteOpen).toBe(false)
    } finally {
      detach()
    }
  })

  it('toggles the shortcuts modal on ⌘/', () => {
    const detach = startGlobalShortcuts()
    try {
      const ui = useUiStore()
      fireKey(window, { key: '/', meta: true })
      expect(ui.shortcutsOpen).toBe(true)
      fireKey(window, { key: '/', meta: true })
      expect(ui.shortcutsOpen).toBe(false)
    } finally {
      detach()
    }
  })

  it('calls onNewPost on ⌘N', () => {
    const calls: string[] = []
    const detach = startGlobalShortcuts({
      onNewPost: () => calls.push('new'),
    })
    try {
      fireKey(window, { key: 'n', meta: true })
      expect(calls).toEqual(['new'])
    } finally {
      detach()
    }
  })

  it('does not double-toggle when app and view shortcuts are both registered', () => {
    const appDetach = startGlobalShortcuts()
    const calls: string[] = []
    const viewDetach = startGlobalShortcuts({
      onNewPost: () => calls.push('new'),
    })
    try {
      const ui = useUiStore()
      fireKey(window, { key: 'k', meta: true })
      expect(ui.paletteOpen).toBe(true)

      fireKey(window, { key: 'n', meta: true })
      expect(calls).toEqual(['new'])
    } finally {
      viewDetach()
      appDetach()
    }
  })

  it('does not call onNewPost on ⌘N when typing in an input', () => {
    const calls: string[] = []
    const detach = startGlobalShortcuts({
      onNewPost: () => calls.push('new'),
    })
    try {
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      // Dispatch from the input — bubbles up to window with target = input
      fireKey(input, { key: 'n', meta: true })
      expect(calls).toEqual([])
      document.body.removeChild(input)
    } finally {
      detach()
    }
  })

  it('calls onSaveNow on ⌘S', () => {
    const calls: string[] = []
    const detach = startGlobalShortcuts({
      onSaveNow: () => calls.push('save'),
    })
    try {
      fireKey(window, { key: 's', meta: true })
      expect(calls).toEqual(['save'])
    } finally {
      detach()
    }
  })

  it('Esc closes the palette when it is open', () => {
    const detach = startGlobalShortcuts()
    try {
      const ui = useUiStore()
      ui.openPalette()
      fireKey(window, { key: 'Escape' })
      expect(ui.paletteOpen).toBe(false)
    } finally {
      detach()
    }
  })

  it('Esc closes the shortcuts modal when it is open', () => {
    const detach = startGlobalShortcuts()
    try {
      const ui = useUiStore()
      ui.openShortcuts()
      fireKey(window, { key: 'Escape' })
      expect(ui.shortcutsOpen).toBe(false)
    } finally {
      detach()
    }
  })

  it('runs the onEscape handler before defaulting', () => {
    let handled = false
    const detach = startGlobalShortcuts({
      onEscape: () => {
        handled = true
        return true
      },
    })
    try {
      const ui = useUiStore()
      ui.openPalette()
      fireKey(window, { key: 'Escape' })
      expect(handled).toBe(true)
      expect(ui.paletteOpen).toBe(true) // handler said it handled, so we did not close
    } finally {
      detach()
    }
  })

  it('pushing a toast directly is reflected by the toasts store', () => {
    const toasts = useToastsStore()
    toasts.push({ kind: 'error', message: 'disk full' })
    expect(toasts.toasts).toHaveLength(1)
    expect(toasts.toasts[0]?.kind).toBe('error')
    expect(toasts.toasts[0]?.message).toBe('disk full')
  })

  it('useErrorToasts pushes a toast when posts.error changes', async () => {
    const { useErrorToasts } = await import('@/lib/useErrorToasts')
    const posts = usePostsStore()
    const toasts = useToastsStore()
    useErrorToasts()
    posts.error = 'disk full'
    await nextTick()
    await nextTick()
    expect(toasts.toasts).toHaveLength(1)
    expect(toasts.toasts[0]?.kind).toBe('error')
    expect(toasts.toasts[0]?.message).toBe('disk full')
  })

  it('useErrorToasts pushes a toast when settings.error changes', async () => {
    const { useErrorToasts } = await import('@/lib/useErrorToasts')
    const settings = useSettingsStore()
    const toasts = useToastsStore()
    useErrorToasts()
    settings.error = 'permission denied'
    await nextTick()
    await nextTick()
    expect(toasts.toasts).toHaveLength(1)
    expect(toasts.toasts[0]?.message).toBe('permission denied')
  })

  it('useErrorToasts deduplicates repeated error values', async () => {
    const { useErrorToasts } = await import('@/lib/useErrorToasts')
    const posts = usePostsStore()
    const toasts = useToastsStore()
    useErrorToasts()
    posts.error = 'disk full'
    await nextTick()
    posts.error = 'disk full'
    await nextTick()
    expect(toasts.toasts).toHaveLength(1)
  })
})
