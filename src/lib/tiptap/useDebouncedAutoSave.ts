import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

export interface UseDebouncedAutoSaveOptions<T> {
  source: Ref<T>
  save: (value: T) => Promise<void> | void
  delay?: number
  isEqual?: (a: T, b: T) => boolean
  onStatusChange?: (status: AutosaveStatus) => void
}

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export function useDebouncedAutoSave<T>(options: UseDebouncedAutoSaveOptions<T>) {
  const status = ref<AutosaveStatus>('idle')
  const lastSaved = ref<T | null>(null)
  const lastError = ref<Error | null>(null)
  const delay = options.delay ?? 800
  const isEqual = options.isEqual ?? ((a, b) => a === b)

  let timer: ReturnType<typeof setTimeout> | null = null
  let pending = false

  function setStatus(next: AutosaveStatus) {
    status.value = next
    options.onStatusChange?.(next)
  }

  async function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pending) return
    pending = false
    const value = options.source.value
    if (lastSaved.value !== null && isEqual(value, lastSaved.value)) {
      setStatus('saved')
      return
    }
    setStatus('saving')
    try {
      await options.save(value)
      lastSaved.value = value
      lastError.value = null
      setStatus('saved')
    } catch (e) {
      lastError.value = e instanceof Error ? e : new Error(String(e))
      setStatus('error')
    }
  }

  function trigger() {
    pending = true
    if (status.value !== 'saving') setStatus('pending')
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void flush()
    }, delay)
  }

  watch(
    options.source,
    () => {
      trigger()
    },
    { deep: true },
  )

  onBeforeUnmount(() => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    void flush()
  })

  return {
    status,
    lastError,
    flush,
    trigger,
  }
}
