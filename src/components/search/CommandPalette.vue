<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '@/stores/posts'
import { useUiStore } from '@/stores/ui'
import {
  createPostIndex,
  deindexPost,
  highlight,
  indexPost,
  type IndexedPost,
  searchPosts,
  type PostSearchHit,
} from '@/lib/search'
import { usePostBodies } from '@/lib/usePostBodies'
import Shortcut from '@/components/ui/Shortcut.vue'
import type { PostMeta, PostStatus } from '@/types/post'

const ui = useUiStore()
const posts = usePostsStore()
const router = useRouter()
const { bodyCache, ensureBodiesLoaded } = usePostBodies()

const query = ref('')
const activeIdx = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const index = createPostIndex()

/**
 * Incremental index sync. We track what we last indexed for each id
 * and only call `indexPost` / `deindexPost` for the delta when the
 * underlying list or body cache shifts. The previous implementation
 * rebuilt the entire index on every change, which is the dominant cost
 * for large post libraries.
 */
const lastIndexed = new Map<string, IndexedPost>()
const INDEX_DEBOUNCE_MS = 150
let syncTimer: ReturnType<typeof setTimeout> | null = null

function buildIndexed(id: string): IndexedPost | null {
  const meta = posts.items.find((p) => p.id === id)
  if (!meta) return null
  return {
    id: meta.id,
    title: meta.title,
    tags: meta.tags.join(' '),
    body: bodyCache.value.get(id) ?? '',
    hook: '',
    cta: '',
    status: meta.status,
    type: meta.type,
  }
}

function indexedChanged(a: IndexedPost, b: IndexedPost): boolean {
  return (
    a.title !== b.title ||
    a.body !== b.body ||
    a.status !== b.status ||
    a.type !== b.type ||
    a.tags !== b.tags
  )
}

function scheduleSync() {
  if (syncTimer) return
  syncTimer = setTimeout(() => {
    syncTimer = null
    doSync()
  }, INDEX_DEBOUNCE_MS)
}

function doSync() {
  const currentIds = new Set<string>()
  for (const m of posts.items) {
    currentIds.add(m.id)
    const next = buildIndexed(m.id)
    if (!next) continue
    const prev = lastIndexed.get(m.id)
    if (!prev) {
      indexPost(index, next)
      lastIndexed.set(m.id, next)
    } else if (indexedChanged(prev, next)) {
      indexPost(index, next)
      lastIndexed.set(m.id, next)
    }
  }
  for (const id of lastIndexed.keys()) {
    if (!currentIds.has(id)) {
      deindexPost(index, id)
      lastIndexed.delete(id)
    }
  }
}

/**
 * Stable string signature of the indexed subset. We only need to wake
 * the sync when the set of posts or the body length / metadata changes
 * for any of them; the actual diff inside `doSync` decides what to
 * re-index.
 */
function indexSignature(): string {
  const cache = bodyCache.value
  let s = ''
  for (const m of posts.items) {
    const body = cache.get(m.id) ?? ''
    s +=
      m.id +
      '\u0001' +
      m.title +
      '\u0001' +
      m.tags.length +
      '\u0001' +
      m.status +
      '\u0001' +
      m.type +
      '\u0001' +
      body.length +
      '\n'
  }
  return s
}

watch(indexSignature, scheduleSync, { immediate: true })

onBeforeUnmount(() => {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  lastIndexed.clear()
})

const hits = computed<PostSearchHit[]>(() => {
  if (!query.value.trim()) return []
  return searchPosts(index, query.value, {
    filter: (h) => {
      const meta = posts.items.find((p) => p.id === h.id)
      if (ui.statusFilter === 'all') return true
      return meta?.status === ui.statusFilter
    },
  }).slice(0, 8)
})

const metaById = computed(() => {
  const map = new Map<string, PostMeta>()
  for (const p of posts.items) map.set(p.id, p)
  return map
})

watch(
  () => ui.paletteOpen,
  async (open) => {
    if (open) {
      void ensureBodiesLoaded()
      activeIdx.value = 0
      await nextTick()
      inputRef.value?.focus()
      return
    }
    query.value = ''
  },
)

watch(hits, () => {
  activeIdx.value = 0
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    ui.closePalette()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (hits.value.length === 0) return
    activeIdx.value = (activeIdx.value + 1) % hits.value.length
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (hits.value.length === 0) return
    activeIdx.value = (activeIdx.value - 1 + hits.value.length) % hits.value.length
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    const hit = hits.value[activeIdx.value]
    if (hit) openHit(hit)
  }
}

function onBackdropClick() {
  ui.closePalette()
}

function openHit(hit: PostSearchHit) {
  const meta = metaById.value.get(hit.id)
  if (!meta) return
  ui.closePalette()
  void router.push({ name: 'editor', params: { id: meta.id } })
}

function statusLabel(s: PostStatus): string {
  return s
}

function snippetFor(hit: PostSearchHit): string {
  const body = bodyCache.value.get(hit.id) ?? ''
  const terms = hit.terms ?? []
  if (body) {
    for (const t of terms) {
      const i = body.toLowerCase().indexOf(t.toLowerCase())
      if (i >= 0) return highlight(body.slice(Math.max(0, i - 20), i + 100), terms[0] ?? '', 100)
    }
    return highlight(body, terms[0] ?? '', 100)
  }
  return ''
}

onMounted(() => {
  void ensureBodiesLoaded()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.paletteOpen"
      class="palette-backdrop"
      data-testid="command-palette"
      @click="onBackdropClick"
    >
      <div class="palette" role="dialog" aria-label="Command palette" @click.stop>
        <div class="palette-input">
          <span class="prompt">›</span>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Search posts by title, tag, or body…"
            aria-label="Search posts"
            data-testid="palette-input"
            @keydown="onKeydown"
          />
          <Shortcut keys="esc" treatment="keycap" />
        </div>

        <ul v-if="hits.length > 0" class="palette-results" data-testid="palette-results">
          <li
            v-for="(hit, i) in hits"
            :key="hit.id"
            class="hit"
            :class="{ active: i === activeIdx }"
            :data-testid="`palette-hit-${hit.id}`"
            @mouseenter="activeIdx = i"
            @click="openHit(hit)"
          >
            <div class="hit-main">
              <div class="hit-title">{{ hit.title || 'Untitled' }}</div>
              <div v-if="snippetFor(hit)" class="hit-snippet">{{ snippetFor(hit) }}</div>
            </div>
            <div class="hit-meta">
              <span class="badge" :data-status="hit.status">{{
                statusLabel(hit.status as PostStatus)
              }}</span>
              <span class="muted">{{ hit.type }}</span>
            </div>
          </li>
        </ul>

        <div v-else-if="query.trim()" class="palette-empty" data-testid="palette-empty">
          <p class="muted">No posts match “{{ query }}”.</p>
        </div>

        <div v-else class="palette-empty">
          <p class="muted">
            Type to search across all posts. Use
            <Shortcut keys="up" treatment="keycap" />
            <Shortcut keys="down" treatment="keycap" />
            to navigate,
            <Shortcut keys="enter" treatment="keycap" />
            to open.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  z-index: 50;
}

.palette {
  width: 560px;
  max-width: 92vw;
  background: var(--panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.palette-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.prompt {
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 16px;
}

.palette-input input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 15px;
  font-family: var(--font-sans);
}

.hint {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-faint);
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.palette-results {
  list-style: none;
  padding: 4px;
  margin: 0;
  max-height: 60vh;
  overflow: auto;
}

.hit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}

.hit.active {
  background: var(--panel-2);
  box-shadow: inset 2px 0 0 var(--accent);
}

.hit-main {
  flex: 1;
  min-width: 0;
}

.hit-title {
  font-size: 13px;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hit-snippet {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hit-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  flex-shrink: 0;
}

.badge {
  display: inline-block;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  border-radius: 4px;
  border: 1px solid var(--border-strong);
  background: var(--panel-2);
  color: var(--text-muted);
  text-transform: lowercase;
}

.badge[data-status='published'] {
  color: var(--success);
  border-color: var(--success-soft);
}

.badge[data-status='scheduled'] {
  color: var(--warning);
  border-color: var(--warning-soft);
}

.palette-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
}
</style>
