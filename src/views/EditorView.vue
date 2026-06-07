<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { computeStats, type PostStats } from '@/lib/tiptap/stats'
import { useDebouncedAutoSave, type AutosaveStatus } from '@/lib/tiptap/useDebouncedAutoSave'
import { resolvePostsDir } from '@/lib/posts-dir'
import { useGlobalShortcuts } from '@/lib/useGlobalShortcuts'
import { useToasts } from '@/lib/useToasts'
import { postEqual } from '@/lib/postEqual'
import PostEditor from '@/components/editor/PostEditor.vue'
import MetadataPanel from '@/components/editor/MetadataPanel.vue'
import StatusBar from '@/components/editor/StatusBar.vue'
import LinkedinExport from '@/components/editor/LinkedinExport.vue'
import PrintExport from '@/components/editor/PrintExport.vue'
import VersionDrawer from '@/components/editor/VersionDrawer.vue'
import EditorSkeleton from '@/components/ui/EditorSkeleton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { LinkedinMeta, Post, PostStatus, PostType } from '@/types/post'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const postsStore = usePostsStore()
const toasts = useToasts()

const draft = ref<Post | null>(null)
const body = ref('')
const loadError = ref<string | null>(null)

const postId = computed<string>(() => {
  const raw = route.params.id
  if (Array.isArray(raw)) return raw[0] ?? ''
  return typeof raw === 'string' ? raw : ''
})

const postPath = computed<string>(() => draft.value?.path ?? '')

const postsDir = computed<string | null>(() => {
  if (!settings.postsFolder) return null
  return resolvePostsDir(settings.postsFolder)
})

const stats = computed<PostStats>(() => computeStats(body.value))

const HISTORY_SNAPSHOT_INTERVAL_MS = 15_000
const lastSnapshotAt = ref(0)

const { status, flush } = useDebouncedAutoSave({
  source: draft,
  delay: 800,
  isEqual: (a, b) => postEqual(a, b),
  save: async (value) => {
    if (!value) return
    const now = Date.now()
    const shouldSnapshot = now - lastSnapshotAt.value >= HISTORY_SNAPSHOT_INTERVAL_MS
    await postsStore.save(value, { snapshot: shouldSnapshot })
    if (shouldSnapshot) lastSnapshotAt.value = now
  },
})

useGlobalShortcuts({
  onSaveNow: async () => {
    if (!draft.value) return
    await flush()
    if (status.value === 'saved') toasts.success('Saved')
    else if (status.value === 'error') toasts.error('Save failed')
  },
})

async function resolvePathForId(id: string): Promise<string | null> {
  if (!id) return null
  const meta = postsStore.items.find((p) => p.id === id)
  if (meta) return meta.path
  if (postsStore.items.length === 0) {
    try {
      await postsStore.refresh()
    } catch {
      return null
    }
  }
  const after = postsStore.items.find((p) => p.id === id)
  return after?.path ?? null
}

async function loadPost() {
  loadError.value = null
  if (!postId.value) {
    loadError.value = 'no post id in route'
    return
  }
  const path = await resolvePathForId(postId.value)
  if (!path) {
    loadError.value = `post not found: ${postId.value}`
    return
  }
  if (!postsStore.current || postsStore.current.path !== path) {
    try {
      await postsStore.open(path)
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e)
      return
    }
  }
  const p = postsStore.current
  if (!p) {
    loadError.value = 'post not found'
    return
  }
  draft.value = { ...p, body: p.body ?? '' }
  body.value = p.body ?? ''
}

onMounted(async () => {
  if (!settings.initialized) await settings.init()
  await loadPost()
})

watch(
  () => route.params.id,
  () => {
    lastSnapshotAt.value = 0
    void loadPost()
  },
)

watch(
  () => postsStore.current,
  (p) => {
    if (!p) return
    if (!draft.value || draft.value.id === p.id) {
      draft.value = { ...p, body: p.body ?? '' }
      body.value = p.body ?? ''
    }
  },
)

function onBodyUpdate(value: string) {
  body.value = value
  if (draft.value) draft.value = { ...draft.value, body: value }
}

function onAssetAdded(relPath: string) {
  if (!draft.value) return
  if (draft.value.assets.includes(relPath)) return
  draft.value = { ...draft.value, assets: [...draft.value.assets, relPath] }
}

function onTitleUpdate(value: string) {
  if (!draft.value) return
  draft.value = { ...draft.value, title: value }
}

function onStatusUpdate(value: PostStatus) {
  if (!draft.value) return
  const next: Post = { ...draft.value, status: value }
  if (value === 'published' && !next.publishedAt) {
    next.publishedAt = new Date().toISOString()
  }
  draft.value = next
}

function onTypeUpdate(value: PostType) {
  if (!draft.value) return
  draft.value = { ...draft.value, type: value }
}

function onTagsUpdate(value: string[]) {
  if (!draft.value) return
  draft.value = { ...draft.value, tags: value }
}

function onLinkedinUpdate(value: LinkedinMeta) {
  if (!draft.value) return
  draft.value = { ...draft.value, linkedin: value }
}

function onScheduledUpdate(value: string | null) {
  if (!draft.value) return
  draft.value = { ...draft.value, scheduledFor: value }
}

function goBack() {
  void router.push({ name: 'home' })
}

const historyOpen = ref(false)
function openHistory() {
  historyOpen.value = true
}
function closeHistory() {
  historyOpen.value = false
}
function onHistoryRestored() {
  // drawer reloads its own list; nothing else to do
}

const printDate = computed(() => {
  const iso = draft.value?.updatedAt ?? draft.value?.createdAt ?? ''
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
})

const printHashtags = computed(() => {
  if (!draft.value || draft.value.type !== 'linkedin') return []
  return draft.value.linkedin.hashtags.map((h) => h.replace(/^#+/, '').trim()).filter(Boolean)
})

function onPrintTriggered() {
  // hook for future analytics / toasts — kept side-effect free for now
}
</script>

<template>
  <section class="editor-view" data-testid="editor-view">
    <header class="editor-bar" data-testid="editor-bar">
      <button class="btn btn-ghost back" data-testid="editor-back-btn" @click="goBack">
        <AppIcon name="arrow-left" />
        Posts
      </button>
      <div class="path" data-testid="editor-path" :title="postPath">{{ postPath }}</div>
      <button
        v-if="draft"
        class="btn btn-ghost history"
        type="button"
        data-testid="editor-history-btn"
        @click="openHistory"
      >
        <AppIcon name="clock" />
        History
      </button>
      <PrintExport
        v-if="draft"
        :disabled="!draft"
        data-testid="print-export-slot"
        @print="onPrintTriggered"
      />
      <LinkedinExport
        v-if="draft && draft.type === 'linkedin'"
        :post="draft"
        class="export"
        data-testid="linkedin-export-slot"
      />
    </header>

    <div v-if="loadError" class="load-error" data-testid="load-error">
      <p>
        Could not open post: <code>{{ loadError }}</code>
      </p>
      <button class="btn" @click="goBack">Back to Posts</button>
    </div>

    <div v-else-if="!draft" class="loading" data-testid="editor-loading">
      <EditorSkeleton />
    </div>

    <div v-else class="editor-body" data-testid="editor-body">
      <header class="print-only" data-testid="print-header">
        <h1 class="print-title">{{ draft.title || 'Untitled post' }}</h1>
        <div class="print-meta">
          <span class="print-type">{{ draft.type }}</span>
          <span class="print-sep">·</span>
          <span class="print-status">{{ draft.status }}</span>
          <span class="print-sep">·</span>
          <span class="print-date">{{ printDate }}</span>
        </div>
        <p
          v-if="draft.type === 'linkedin' && draft.linkedin.hook"
          class="print-hook"
          data-testid="print-hook"
        >
          {{ draft.linkedin.hook }}
        </p>
        <ul v-if="printHashtags.length > 0" class="print-tags" data-testid="print-tags">
          <li v-for="tag in printHashtags" :key="tag">{{ tag }}</li>
        </ul>
      </header>
      <PostEditor
        v-model="body"
        :posts-dir="postsDir"
        class="editor-pane"
        data-testid="post-editor"
        @update:model-value="onBodyUpdate"
        @asset-added="onAssetAdded"
      />
      <MetadataPanel
        :post="draft"
        class="meta-pane"
        data-testid="metadata-panel"
        @update:title="onTitleUpdate"
        @update:status="onStatusUpdate"
        @update:type="onTypeUpdate"
        @update:tags="onTagsUpdate"
        @update:linkedin="onLinkedinUpdate"
        @update:scheduled-for="onScheduledUpdate"
      />
    </div>

    <StatusBar
      v-if="draft"
      :status="status as AutosaveStatus"
      :stats="stats"
      :path="draft.path"
      data-testid="status-bar"
    />

    <VersionDrawer
      :open="historyOpen"
      :post="draft"
      data-testid="version-drawer-slot"
      @close="closeHistory"
      @restored="onHistoryRestored"
    />
  </section>
</template>

<style scoped>
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.editor-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}

.back {
  font-size: 12px;
}

.path {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.export {
  flex: 0 0 auto;
}

.history {
  font-size: 12px;
}

.editor-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.editor-pane {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.meta-pane {
  flex: 0 0 280px;
}

.loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg);
}

.load-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.load-error code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--panel-2);
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--danger);
}
</style>
