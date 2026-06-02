import { useToastsStore } from '@/stores/toasts'

/**
 * Sugar over the toasts store for one-line calls like
 * `useToasts().success('Copied')`. Re-exported from views.
 */
export function useToasts() {
  const store = useToastsStore()
  return {
    toasts: store.toasts,
    push: store.push,
    info: store.info,
    success: store.success,
    warn: store.warn,
    error: store.error,
    dismiss: store.dismiss,
    clear: store.clear,
  }
}
