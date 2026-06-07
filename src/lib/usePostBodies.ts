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

function idsFromStore(): string[] {
  const posts = usePostsStore()
  return posts.items.map((p) => p.id)
}

async function ensureBodiesLoaded(): Promise<void> {
  await loadMissingBodies(idsFromStore())
}

/**
 * Cheap signature of the current posts list. Only changes when ids are
 * added or removed (in-place metadata patches don't change it), so the
 * watcher stays quiet during the per-keystroke autosave storm and only
 * re-fires when the membership of the list actually shifts.
 */
function listSignature(): string {
  const posts = usePostsStore()
  let sig = ''
  for (const p of posts.items) sig += `${p.id}|`
  return sig
}

/**
 * Write a body into the cache without going through the read pipeline.
 * Called by the posts store after a save so the palette / preview see
 * the fresh body without re-fetching the file.
 */
export function setBody(id: string, body: string): void {
  bodyCache.value.set(id, body)
}

export function forgetBody(id: string): void {
  bodyCache.value.delete(id)
}

export function usePostBodies() {
  watch(
    listSignature,
    () => {
      inflight = ensureBodiesLoaded()
    },
    { immediate: true },
  )
  return {
    bodyCache,
    ensureBodiesLoaded: () => inflight ?? ensureBodiesLoaded(),
    setBody,
    forgetBody,
  }
}
