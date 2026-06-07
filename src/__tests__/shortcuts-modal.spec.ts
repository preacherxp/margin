import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ShortcutsModal from '@/components/shell/ShortcutsModal.vue'
import { useUiStore } from '@/stores/ui'
import { SHORTCUTS } from '@/lib/useGlobalShortcuts'

describe('ShortcutsModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
  })

  const mounted: VueWrapper[] = []
  function mountModal(): VueWrapper {
    const w = mount(ShortcutsModal, { attachTo: document.body })
    mounted.push(w)
    return w
  }
  afterEach(() => {
    for (const w of mounted.splice(0)) {
      try {
        w.unmount()
      } catch {
        // ignore teardown noise
      }
    }
    document.body.innerHTML = ''
  })

  it('does not render when closed', () => {
    mountModal()
    expect(document.querySelector('[data-testid="shortcuts-modal"]')).toBeNull()
  })

  it('renders every shortcut from the registry when open', async () => {
    const ui = useUiStore()
    ui.openShortcuts()
    mountModal()
    await nextTick()
    expect(document.querySelector('[data-testid="shortcuts-modal"]')).not.toBeNull()
    for (const s of SHORTCUTS) {
      expect(document.body.textContent ?? '').toContain(s.description)
    }
  })

  it('groups shortcuts by scope (global, home, editor)', async () => {
    const ui = useUiStore()
    ui.openShortcuts()
    mountModal()
    await nextTick()
    const groups = document.querySelectorAll('.group')
    expect(groups.length).toBe(3)
    const titles = Array.from(groups).map((g) => g.querySelector('.group-title')?.textContent)
    expect(titles).toEqual(['Global', 'Posts', 'Editor'])
  })

  it('renders shortcuts as macOS glyphs', async () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    })
    const ui = useUiStore()
    ui.openShortcuts()
    mountModal()
    await nextTick()
    const keys = document.querySelectorAll('.key')
    expect(Array.from(keys).some((k) => (k.textContent ?? '').includes('⌘'))).toBe(true)
  })

  it('does not render spelled-out modifiers on non-Mac platforms', async () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    })
    const ui = useUiStore()
    ui.openShortcuts()
    mountModal()
    await nextTick()
    const keys = document.querySelectorAll('.key')
    expect(Array.from(keys).some((k) => (k.textContent ?? '').includes('⌘'))).toBe(true)
    expect(document.body.textContent ?? '').not.toContain('Ctrl')
  })

  it('closes when the close button is clicked', async () => {
    const ui = useUiStore()
    ui.openShortcuts()
    mountModal()
    await nextTick()
    const btn = document.querySelector<HTMLButtonElement>('[data-testid="shortcuts-modal-close"]')
    expect(btn).not.toBeNull()
    btn?.click()
    expect(ui.shortcutsOpen).toBe(false)
  })

  it('closes on backdrop click', async () => {
    const ui = useUiStore()
    ui.openShortcuts()
    mountModal()
    await nextTick()
    const backdrop = document.querySelector<HTMLElement>('[data-testid="shortcuts-modal"]')
    expect(backdrop).not.toBeNull()
    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(ui.shortcutsOpen).toBe(false)
  })

  it('closes on Escape key', async () => {
    const ui = useUiStore()
    ui.openShortcuts()
    mountModal()
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(ui.shortcutsOpen).toBe(false)
  })
})
