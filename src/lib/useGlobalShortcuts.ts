import { onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui'
import { matchesShortcut, renderShortcut } from '@/lib/shortcuts'

export interface GlobalShortcutHandlers {
  onNewPost?: () => void
  onSaveNow?: () => void
  onRefresh?: () => void
  onShowShortcuts?: () => void
  onEscape?: () => boolean
}

export interface ShortcutDef {
  combo: string
  description: string
  scope: 'global' | 'home' | 'editor'
}

export const SHORTCUTS: ShortcutDef[] = [
  { combo: 'mod+k', description: 'Open Command Palette', scope: 'global' },
  { combo: 'mod+n', description: 'New Post', scope: 'home' },
  { combo: 'mod+s', description: 'Save Now', scope: 'editor' },
  { combo: 'mod+/', description: 'Show Keyboard Shortcuts', scope: 'global' },
  { combo: 'mod+r', description: 'Refresh Posts', scope: 'global' },
  { combo: 'esc', description: 'Close Panel / Dismiss Toast', scope: 'global' },
]

export const SHORTCUT = {
  commandPalette: SHORTCUTS[0]!.combo,
  newPost: SHORTCUTS[1]!.combo,
  saveNow: SHORTCUTS[2]!.combo,
  shortcuts: SHORTCUTS[3]!.combo,
  refresh: SHORTCUTS[4]!.combo,
  escape: SHORTCUTS[5]!.combo,
} as const

export function shortcutLabel(combo: string): string {
  return renderShortcut(combo)
}

function isTextEditable(el: HTMLElement | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

function makeHandler(): (e: KeyboardEvent) => void {
  return function (e: KeyboardEvent) {
    if (typeof window === 'undefined') return
    const ui = useUiStore()
    const target = e.target as HTMLElement | null
    const inEditable = isTextEditable(target)

    if (matchesShortcut(e, SHORTCUT.escape)) {
      for (let i = handlersStack.length - 1; i >= 0; i -= 1) {
        if (handlersStack[i]?.onEscape?.()) {
          e.preventDefault()
          return
        }
      }
      if (ui.paletteOpen) {
        e.preventDefault()
        ui.closePalette()
        return
      }
      if (ui.shortcutsOpen) {
        e.preventDefault()
        ui.closeShortcuts()
        return
      }
    }

    if (matchesShortcut(e, SHORTCUT.commandPalette)) {
      e.preventDefault()
      ui.togglePalette()
      return
    }
    if (matchesShortcut(e, SHORTCUT.shortcuts)) {
      e.preventDefault()
      ui.toggleShortcuts()
      return
    }
    if (matchesShortcut(e, SHORTCUT.newPost)) {
      if (inEditable) return
      const active = findActiveHandler('onNewPost')
      if (active) {
        e.preventDefault()
        active.onNewPost?.()
        return
      }
    }
    if (matchesShortcut(e, SHORTCUT.saveNow)) {
      const active = findActiveHandler('onSaveNow')
      if (active) {
        e.preventDefault()
        active.onSaveNow?.()
        return
      }
    }
    if (matchesShortcut(e, SHORTCUT.refresh)) {
      const active = findActiveHandler('onRefresh')
      if (active) {
        e.preventDefault()
        active.onRefresh?.()
        return
      }
    }
  }
}

const handlersStack: GlobalShortcutHandlers[] = []
let rootHandler: ((e: KeyboardEvent) => void) | null = null
const listenerOptions = { capture: true }

function findActiveHandler(name: 'onNewPost' | 'onSaveNow' | 'onRefresh'): GlobalShortcutHandlers | undefined {
  for (let i = handlersStack.length - 1; i >= 0; i -= 1) {
    if (handlersStack[i]?.[name]) return handlersStack[i]
  }
  return undefined
}

/**
 * Imperative version — register the keydown listener immediately and
 * return a teardown. Use from outside a component (e.g. tests).
 */
export function startGlobalShortcuts(handlers: GlobalShortcutHandlers = {}): () => void {
  if (typeof window === 'undefined') return () => {}
  if (typeof window.addEventListener !== 'function') return () => {}
  handlersStack.push(handlers)
  if (!rootHandler) {
    rootHandler = makeHandler()
    window.addEventListener('keydown', rootHandler, listenerOptions)
  }
  return () => {
    const idx = handlersStack.lastIndexOf(handlers)
    if (idx >= 0) handlersStack.splice(idx, 1)
    if (handlersStack.length === 0 && rootHandler && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', rootHandler, listenerOptions)
      rootHandler = null
    }
  }
}

/**
 * Component-friendly — wire the global shortcuts into the component
 * lifecycle. Call once per view that needs the keybindings.
 */
export function useGlobalShortcuts(handlers: GlobalShortcutHandlers = {}) {
  const detach = startGlobalShortcuts(handlers)
  onBeforeUnmount(detach)
}
