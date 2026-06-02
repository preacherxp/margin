import { onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import type { Theme } from '@/types/settings'

export type ResolvedTheme = 'dark' | 'light'

const SYSTEM_QUERY = '(prefers-color-scheme: light)'

function readSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }
  return window.matchMedia(SYSTEM_QUERY).matches ? 'light' : 'dark'
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme
  return readSystemTheme()
}

function applyResolved(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Pure function — applies a theme setting to the document. Returns a
 * teardown function that removes the system-mode listener (if any) so
 * callers can wire it up however they like.
 */
export function applyTheme(theme: Theme): () => void {
  if (typeof document === 'undefined') return () => {}
  applyResolved(resolveTheme(theme))

  if (theme !== 'system') return () => {}
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const mql = window.matchMedia(SYSTEM_QUERY)
  const onChange = () => applyResolved(readSystemTheme())
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', onChange)
  } else if (typeof mql.addListener === 'function') {
    mql.addListener(onChange)
  }
  return () => {
    if (typeof mql.removeEventListener === 'function') {
      mql.removeEventListener('change', onChange)
    } else if (typeof mql.removeListener === 'function') {
      mql.removeListener(onChange)
    }
  }
}

/**
 * Reactive theme wiring. Mounts once near the app root. Watches the
 * settings store, re-applies the theme when it changes, and tears
 * down the system-mode listener on unmount.
 */
export function useTheme() {
  const settings = useSettingsStore()
  const { theme } = storeToRefs(settings)

  let detach = applyTheme(theme.value)
  watch(theme, (next) => {
    detach()
    detach = applyTheme(next)
  })

  onBeforeUnmount(() => {
    detach()
  })
}
