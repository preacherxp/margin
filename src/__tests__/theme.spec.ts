import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { applyTheme, resolveTheme } from '@/lib/theme'

interface MockMql {
  matches: boolean
  listeners: Array<() => void>
  addEventListener: MockMqlFn
  removeEventListener: MockMqlFn
  dispatch: (next: boolean) => void
}

type MockMqlFn = (type: string, cb: () => void) => void

function installMatchMedia(initial: 'light' | 'dark'): MockMql {
  const mql: MockMql = {
    matches: initial === 'light',
    listeners: [],
    addEventListener: vi.fn<MockMqlFn>((_type, cb) => {
      mql.listeners.push(cb)
    }),
    removeEventListener: vi.fn<MockMqlFn>((_type, cb) => {
      mql.listeners = mql.listeners.filter((l) => l !== cb)
    }),
    dispatch(next: boolean) {
      mql.matches = next
      for (const l of mql.listeners) l()
    },
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      expect(query).toBe('(prefers-color-scheme: light)')
      return mql
    }),
  )
  return mql
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('data-theme')
})

describe('resolveTheme', () => {
  it('returns dark for "dark"', () => {
    installMatchMedia('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('returns light for "light"', () => {
    installMatchMedia('dark')
    expect(resolveTheme('light')).toBe('light')
  })

  it('returns sepia for "sepia"', () => {
    installMatchMedia('light')
    expect(resolveTheme('sepia')).toBe('sepia')
  })

  it('returns high-contrast for "high-contrast"', () => {
    installMatchMedia('light')
    expect(resolveTheme('high-contrast')).toBe('high-contrast')
  })

  it('returns nord for "nord"', () => {
    installMatchMedia('light')
    expect(resolveTheme('nord')).toBe('nord')
  })

  it('returns light when system prefers light', () => {
    installMatchMedia('light')
    expect(resolveTheme('system')).toBe('light')
  })

  it('returns dark when system prefers dark', () => {
    installMatchMedia('dark')
    expect(resolveTheme('system')).toBe('dark')
  })
})

describe('applyTheme', () => {
  it('sets data-theme on <html> for explicit choices', () => {
    installMatchMedia('dark')
    const detach = applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    detach()
  })

  it('applies palette themes to <html>', () => {
    installMatchMedia('dark')

    const detachSepia = applyTheme('sepia')
    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia')
    detachSepia()

    const detachHC = applyTheme('high-contrast')
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast')
    detachHC()

    const detachNord = applyTheme('nord')
    expect(document.documentElement.getAttribute('data-theme')).toBe('nord')
    detachNord()
  })

  it('does not subscribe to media changes for explicit choices', () => {
    const mql = installMatchMedia('dark')
    const detach = applyTheme('dark')
    expect(mql.addEventListener).not.toHaveBeenCalled()
    detach()
  })

  it('subscribes to media changes in system mode', () => {
    const mql = installMatchMedia('light')
    const detach = applyTheme('system')
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    mql.dispatch(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    mql.dispatch(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    detach()
    expect(mql.removeEventListener).toHaveBeenCalled()
  })

  it('detached listener stops reacting to media changes', () => {
    const mql = installMatchMedia('light')
    const detach = applyTheme('system')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    detach()
    mql.dispatch(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
