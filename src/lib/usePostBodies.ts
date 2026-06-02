import { ref, watch } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { readPost } from './tauri-bridge'

const bodyCache = ref<Map<string, string>>(new Map())
let inflight: Promise<void> | null = null

async function loadMissingBodies(ids: string[]): Promise<void> {
  const missing = ids.filter((id) => !bodyCache.value.has(id))
  if (missing.length === 0) return
  const results = await Promise.all(
    missing.map(async (id) => {
      try {
        const posts = usePostsStore()
        const meta = posts.items.find((p) => p.id === id)
        if (!meta) return null
        const full = await readPost(meta.path)
        return { id, body: full.body ?? '' }
      } catch {
        return null
      }
    }),
  )
  for (const r of results) {
    if (r) bodyCache.value.set(r.id, r.body)
  }
}

async function ensureBodiesLoaded(): Promise<void> {
  const posts = usePostsStore()
  await loadMissingBodies(posts.items.map((p) => p.id))
}

export function usePostBodies() {
  const posts = usePostsStore()
  watch(
    () => posts.items.map((p) => p.id).join('|'),
    () => {
      inflight = ensureBodiesLoaded()
    },
    { immediate: true },
  )
  return {
    bodyCache,
    ensureBodiesLoaded: () => inflight ?? ensureBodiesLoaded(),
  }
}
