export type ShortcutToken =
  | 'cmd'
  | 'mod'
  | 'ctrl'
  | 'alt'
  | 'option'
  | 'shift'
  | 'enter'
  | 'return'
  | 'esc'
  | 'delete'
  | 'backspace'
  | 'tab'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | string

const GLYPH: Record<string, string> = {
  cmd: '⌘',
  mod: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
  enter: '⏎',
  return: '⏎',
  esc: '⎋',
  delete: '⌫',
  backspace: '⌫',
  tab: '⇥',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

export function renderShortcut(keys: string): string {
  return keys
    .split('+')
    .map((key) => {
      const token = key.trim().toLowerCase()
      return GLYPH[token] ?? token.toUpperCase()
    })
    .join('')
}

export function shortcutTitle(label: string, keys?: string): string {
  return keys ? `${label} (${renderShortcut(keys)})` : label
}

export function matchesShortcut(e: KeyboardEvent, keys: string): boolean {
  const tokens = keys.split('+').map((key) => key.trim().toLowerCase())
  const key = tokens.pop()
  if (!key) return false

  if (!matchesKey(e, key)) return false

  const wantsCmd = tokens.includes('mod') || tokens.includes('cmd')
  const wantsAlt = tokens.includes('alt') || tokens.includes('option')

  return (
    wantsCmd === (e.metaKey || e.getModifierState?.('Meta') === true) &&
    tokens.includes('shift') === e.shiftKey &&
    wantsAlt === e.altKey &&
    tokens.includes('ctrl') === e.ctrlKey
  )
}

function matchesKey(e: KeyboardEvent, key: string): boolean {
  const normalized = normalizeKey(key)
  const eventKey = normalizeKey(e.key)
  if (eventKey === normalized) return true

  const code = e.code.toLowerCase()
  if (/^[a-z]$/.test(normalized) && code === `key${normalized}`) return true
  if (/^[0-9]$/.test(normalized) && code === `digit${normalized}`) return true
  if (normalized === '/' && code === 'slash') return true
  if (normalized === 'escape' && code === 'escape') return true
  if (normalized === 'enter' && code === 'enter') return true
  if (normalized === 'backspace' && code === 'backspace') return true
  if (normalized === 'tab' && code === 'tab') return true

  const legacyCode = e.keyCode || e.which
  if (/^[a-z]$/.test(normalized)) return legacyCode === normalized.toUpperCase().charCodeAt(0)
  if (normalized === '/') return legacyCode === 191
  if (normalized === 'escape') return legacyCode === 27
  if (normalized === 'enter') return legacyCode === 13
  if (normalized === 'backspace') return legacyCode === 8
  if (normalized === 'tab') return legacyCode === 9

  return false
}

function normalizeKey(key: string): string {
  const lower = key.trim().toLowerCase()
  if (lower === 'esc') return 'escape'
  if (lower === 'return') return 'enter'
  if (lower === 'delete') return 'backspace'
  if (lower === 'arrowup') return 'up'
  if (lower === 'arrowdown') return 'down'
  if (lower === 'arrowleft') return 'left'
  if (lower === 'arrowright') return 'right'
  return lower
}
