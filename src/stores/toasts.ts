import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'info' | 'success' | 'warn' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  duration: number
}

let nextId = 1

export interface ToastInput {
  kind?: ToastKind
  message: string
  duration?: number
}

export const useToastsStore = defineStore('toasts', () => {
  const toasts = ref<Toast[]>([])

  function push(input: ToastInput): number {
    const id = nextId++
    const toast: Toast = {
      id,
      kind: input.kind ?? 'info',
      message: input.message,
      duration: input.duration ?? defaultDurationFor(input.kind ?? 'info'),
    }
    toasts.value = [...toasts.value, toast]
    if (toast.duration > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => dismiss(id), toast.duration)
    }
    return id
  }

  function info(message: string, duration?: number): number {
    return push({ kind: 'info', message, duration })
  }
  function success(message: string, duration?: number): number {
    return push({ kind: 'success', message, duration })
  }
  function warn(message: string, duration?: number): number {
    return push({ kind: 'warn', message, duration })
  }
  function error(message: string, duration?: number): number {
    return push({ kind: 'error', message, duration })
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function clear() {
    toasts.value = []
  }

  return { toasts, push, info, success, warn, error, dismiss, clear }
})

function defaultDurationFor(kind: ToastKind): number {
  if (kind === 'error') return 6000
  if (kind === 'warn') return 5000
  if (kind === 'success') return 3200
  return 3500
}
