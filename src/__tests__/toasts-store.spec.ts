import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastsStore, type Toast } from '@/stores/toasts'
import { useToasts } from '@/lib/useToasts'

describe('toasts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with no toasts', () => {
    const toasts = useToastsStore()
    expect(toasts.toasts).toEqual([])
  })

  it('pushes a toast and assigns a unique id', () => {
    const toasts = useToastsStore()
    const id1 = toasts.push({ message: 'one' })
    const id2 = toasts.push({ message: 'two' })
    expect(id1).not.toBe(id2)
    expect(toasts.toasts).toHaveLength(2)
    expect(toasts.toasts[0]?.message).toBe('one')
    expect(toasts.toasts[1]?.message).toBe('two')
  })

  it('defaults to info kind with non-zero duration', () => {
    const toasts = useToastsStore()
    toasts.push({ message: 'hello' })
    const t: Toast | undefined = toasts.toasts[0]
    expect(t?.kind).toBe('info')
    expect(t?.duration).toBeGreaterThan(0)
  })

  it('uses a longer default duration for errors', () => {
    const toasts = useToastsStore()
    toasts.push({ kind: 'error', message: 'boom' })
    const t: Toast | undefined = toasts.toasts[0]
    expect(t?.kind).toBe('error')
    expect(t?.duration).toBeGreaterThanOrEqual(4000)
  })

  it('dismisses a specific toast by id', () => {
    const toasts = useToastsStore()
    const id = toasts.push({ message: 'gone' })
    expect(toasts.toasts).toHaveLength(1)
    toasts.dismiss(id)
    expect(toasts.toasts).toHaveLength(0)
  })

  it('auto-dismisses a toast after its duration', () => {
    const toasts = useToastsStore()
    toasts.push({ kind: 'success', message: 'flash', duration: 1000 })
    expect(toasts.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1100)
    expect(toasts.toasts).toHaveLength(0)
  })

  it('keeps a toast pinned when duration is zero', () => {
    const toasts = useToastsStore()
    toasts.push({ kind: 'error', message: 'pinned', duration: 0 })
    vi.advanceTimersByTime(10_000)
    expect(toasts.toasts).toHaveLength(1)
  })

  it('exposes kind sugar helpers', () => {
    const toasts = useToastsStore()
    toasts.info('i')
    toasts.success('s')
    toasts.warn('w')
    toasts.error('e')
    const kinds = toasts.toasts.map((t) => t.kind)
    expect(kinds).toEqual(['info', 'success', 'warn', 'error'])
  })

  it('clears all toasts', () => {
    const toasts = useToastsStore()
    toasts.push({ message: 'a' })
    toasts.push({ message: 'b' })
    toasts.push({ message: 'c' })
    toasts.clear()
    expect(toasts.toasts).toEqual([])
  })
})

describe('useToasts composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns the same store helpers', () => {
    const a = useToasts()
    a.success('hello')
    const b = useToasts()
    expect(b.toasts ?? a).toBeTruthy()
    const store = useToastsStore()
    expect(store.toasts).toHaveLength(1)
  })
})
