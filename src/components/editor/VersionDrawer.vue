<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Post, VersionContent, VersionMeta } from '@/types/post'
import { useSettingsStore } from '@/stores/settings'
import { usePostsStore } from '@/stores/posts'
import { listVersions, readVersion } from '@/lib/tauri-bridge'
import { serializeFrontmatter } from '@/lib/frontmatter'
import { diffRawContent, formatVersionTs, parseSnapshot, summarizeDiff } from '@/lib/versions'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{
  open: boolean
  post: Post | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'restored'): void
}>()

const settings = useSettingsStore()
const posts = usePostsStore()

const versions = ref<VersionMeta[]>([])
const selectedTs = ref<string | null>(null)
const selectedContent = ref<VersionContent | null>(null)
const currentContent = ref<string | null>(null)
const loadingList = ref(false)
const loadingVersion = ref(false)
const restoring = ref(false)
const error = ref<string | null>(null)
const rootEl = ref<HTMLElement | null>(null)

const folder = computed(() => settings.postsFolder)

const diff = computed<{
  lines: ReturnType<typeof diffRawContent>['lines']
  summary: ReturnType<typeof summarizeDiff>
} | null>(() => {
  if (!currentContent.value || !selectedContent.value) return null
  const { lines } = diffRawContent(selectedContent.value.content, currentContent.value)
  return { lines, summary: summarizeDiff(lines) }
})

const totalDelta = computed(() => {
  if (!diff.value) return ''
  const { added, removed } = diff.value.summary
  if (added === 0 && removed === 0) return 'no changes'
  const parts: string[] = []
  if (added > 0) parts.push(`+${added}`)
  if (removed > 0) parts.push(`−${removed}`)
  return parts.join(' / ')
})

function onDocClick(e: MouseEvent) {
  if (!props.open) return
  const target = e.target as Node | null
  if (target && rootEl.value && !rootEl.value.contains(target)) {
    emit('close')
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    e.stopPropagation()
    emit('close')
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      document.addEventListener('mousedown', onDocClick)
      document.addEventListener('keydown', onKey)
      void loadVersions()
    } else {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      selectedTs.value = null
      selectedContent.value = null
      currentContent.value = null
      error.value = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
})

async function loadVersions() {
  if (!props.post || !folder.value) return
  loadingList.value = true
  error.value = null
  try {
    versions.value = await listVersions(props.post.id, folder.value)
    if (versions.value.length > 0) {
      await selectVersion(versions.value[0]?.ts ?? null)
    } else {
      selectedTs.value = null
      selectedContent.value = null
      currentContent.value = null
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingList.value = false
  }
}

async function selectVersion(ts: string | null) {
  if (!props.post || !folder.value) return
  if (ts === null) {
    selectedTs.value = null
    selectedContent.value = null
    currentContent.value = null
    return
  }
  selectedTs.value = ts
  loadingVersion.value = true
  error.value = null
  try {
    const [old, cur] = await Promise.all([
      readVersion(props.post.id, ts, folder.value),
      Promise.resolve(buildCurrentSnapshot()),
    ])
    selectedContent.value = old
    currentContent.value = cur
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingVersion.value = false
  }
}

function buildCurrentSnapshot(): string {
  if (!props.post) return ''
  return serializeFrontmatter(props.post)
}

async function restore() {
  if (!props.post || !selectedContent.value) return
  const old = selectedContent.value
  const parsed = parseSnapshot(old.content, props.post.path)
  if (!parsed) {
    error.value = 'could not parse version content'
    return
  }
  restoring.value = true
  error.value = null
  try {
    const restored: Post = {
      ...props.post,
      title: parsed.title || props.post.title,
      status: parsed.status || props.post.status,
      type: parsed.type,
      createdAt: parsed.createdAt || props.post.createdAt,
      updatedAt: new Date().toISOString(),
      scheduledFor: parsed.scheduledFor,
      publishedAt: parsed.publishedAt,
      tags: [...parsed.tags],
      template: parsed.template,
      linkedin: { ...parsed.linkedin },
      assets: [...parsed.assets],
      versions: (props.post.versions ?? 0) + 1,
      body: parsed.body,
    }
    await posts.save(restored)
    emit('restored')
    await nextTick()
    await loadVersions()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    restoring.value = false
  }
}

function previewLabel(ts: string): string {
  return formatVersionTs(ts)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="rootEl"
      class="drawer"
      role="dialog"
      aria-label="Version history"
      data-testid="version-drawer"
    >
      <header class="drawer-header" data-testid="version-drawer-header">
        <div>
          <h3>Version History</h3>
          <p class="subtitle">
            <span v-if="post">{{ post.title || 'Untitled' }}</span>
            <span v-else class="muted">No post selected</span>
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-icon close"
          aria-label="Close History"
          title="Close History"
          data-testid="version-drawer-close"
          @click="emit('close')"
        >
          <AppIcon name="x" />
        </button>
      </header>

      <div class="drawer-body">
        <aside class="timeline" data-testid="version-timeline">
          <div v-if="loadingList" class="muted small">Loading versions…</div>
          <div v-else-if="versions.length === 0" class="muted small" data-testid="version-empty">
            No saved versions yet. Autosaves are snapshotted on each save.
          </div>
          <ul v-else class="version-list">
            <li
              v-for="v in versions"
              :key="v.ts"
              class="version-item"
              :class="{ active: selectedTs === v.ts }"
              :data-testid="`version-item-${v.ts}`"
              role="button"
              tabindex="0"
              @click="selectVersion(v.ts)"
              @keydown.enter="selectVersion(v.ts)"
            >
              <div class="row-1">
                <span class="ts">{{ previewLabel(v.ts) }}</span>
                <span class="bytes">{{ v.bytes }} B</span>
              </div>
              <div class="preview">{{ v.preview || '(empty)' }}</div>
            </li>
          </ul>
        </aside>

        <section class="diff-pane" data-testid="version-diff">
          <div v-if="!selectedTs" class="muted center">Select a version from the timeline.</div>
          <div v-else-if="loadingVersion" class="muted center">Loading…</div>
          <template v-else-if="selectedContent && currentContent !== null">
            <div class="diff-meta">
              <div class="meta-block">
                <span class="meta-label">Version</span>
                <span class="meta-value">{{ previewLabel(selectedContent.ts) }}</span>
                <span v-if="selectedContent.title" class="meta-sub">{{
                  selectedContent.title
                }}</span>
              </div>
              <div class="meta-arrow">→</div>
              <div class="meta-block">
                <span class="meta-label">Current</span>
                <span class="meta-value">now</span>
                <span v-if="post" class="meta-sub">{{ post.title || 'Untitled' }}</span>
              </div>
              <div class="delta" :data-empty="totalDelta === 'no changes'">
                {{ totalDelta }}
              </div>
            </div>

            <div v-if="diff" class="diff-table" data-testid="version-diff-table">
              <div
                v-for="(line, i) in diff.lines"
                :key="i"
                class="diff-line"
                :data-kind="line.kind"
                :data-testid="`version-diff-line-${i}`"
              >
                <span class="ln old">{{ line.oldIndex !== null ? line.oldIndex + 1 : '' }}</span>
                <span class="ln new">{{ line.newIndex !== null ? line.newIndex + 1 : '' }}</span>
                <span class="marker">{{
                  line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '
                }}</span>
                <pre class="content">{{ line.value || ' ' }}</pre>
              </div>
              <div v-if="diff.lines.length === 0" class="muted center small">Empty diff.</div>
            </div>

            <div class="diff-actions">
              <button
                type="button"
                class="btn"
                :disabled="totalDelta === 'no changes' || restoring"
                data-testid="version-restore-btn"
                @click="restore"
              >
                {{ restoring ? 'Restoring…' : 'Restore This Version' }}
              </button>
              <span class="muted small">Restoring creates a new save — nothing is destroyed.</span>
            </div>
          </template>
        </section>
      </div>

      <div v-if="error" class="error" data-testid="version-error">{{ error }}</div>
    </div>
  </Teleport>
</template>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(880px, 96vw);
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-left: 1px solid var(--border-strong);
  box-shadow: -16px 0 40px rgba(0, 0, 0, 0.4);
  z-index: 60;
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.drawer-header h3 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text);
}

.muted {
  color: var(--text-faint);
}

.close {
  color: var(--text-faint);
}

.close:hover {
  color: var(--text);
}

.drawer-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.timeline {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  background: var(--bg);
  padding: 8px;
}

.version-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.version-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
}

.version-item:hover {
  background: var(--panel-2);
}

.version-item.active {
  background: var(--panel-2);
  border-color: var(--border-strong);
  box-shadow: inset 2px 0 0 var(--accent);
}

.row-1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 11px;
}

.row-1 .ts {
  color: var(--text);
}

.row-1 .bytes {
  color: var(--text-faint);
  font-size: 10px;
}

.preview {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diff-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.diff-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.meta-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

.meta-value {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
}

.meta-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.meta-arrow {
  color: var(--text-faint);
  font-family: var(--font-mono);
}

.delta {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-muted);
}

.delta[data-empty='true'] {
  color: var(--text-faint);
  border-color: var(--border);
}

.diff-table {
  flex: 1;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--bg);
}

.diff-line {
  display: grid;
  grid-template-columns: 44px 44px 16px 1fr;
  align-items: start;
  padding: 0;
  border-bottom: 1px solid var(--panel-2);
  line-height: 1.5;
}

.diff-line .ln {
  color: var(--text-faint);
  text-align: right;
  padding: 1px 8px;
  user-select: none;
  font-size: 11px;
  background: var(--panel);
}

.diff-line .marker {
  text-align: center;
  color: var(--text-faint);
  padding: 1px 0;
  user-select: none;
}

.diff-line .content {
  margin: 0;
  padding: 1px 10px;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 12px;
}

.diff-line[data-kind='add'] {
  background: rgba(148, 163, 115, 0.12);
}

.diff-line[data-kind='add'] .marker {
  color: var(--success);
}

.diff-line[data-kind='add'] .content {
  color: var(--success);
}

.diff-line[data-kind='del'] {
  background: rgba(231, 111, 81, 0.12);
}

.diff-line[data-kind='del'] .marker {
  color: var(--danger);
}

.diff-line[data-kind='del'] .content {
  color: var(--danger);
}

.diff-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--panel);
}

.center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.small {
  font-size: 11px;
  padding: 8px;
}

.error {
  padding: 8px 12px;
  background: var(--danger-bg);
  border-top: 1px solid var(--danger-soft);
  color: var(--danger);
  font-size: 12px;
}

.btn {
  padding: 6px 12px;
  background: var(--accent);
  color: var(--bg);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
