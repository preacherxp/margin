import { watch } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { useToastsStore } from '@/stores/toasts'

/**
 * Watches the error refs of the posts and settings stores and pushes
 * a toast whenever a new error appears. Mounted once at the app root.
 */
export function useErrorToasts(): void {
  const posts = usePostsStore()
  const settings = useSettingsStore()
  const toasts = useToastsStore()

  let lastPosts: string | null = null
  let lastSettings: string | null = null

  watch(
    () => posts.error,
    (next) => {
      if (next && next !== lastPosts) {
        toasts.push({ kind: 'error', message: next })
      }
      lastPosts = next
    },
  )
  watch(
    () => settings.error,
    (next) => {
      if (next && next !== lastSettings) {
        toasts.push({ kind: 'error', message: next })
      }
      lastSettings = next
    },
  )
}
