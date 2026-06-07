<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { marked } from 'marked'
import { usePostsStore } from '@/stores/posts'
import { useUiStore } from '@/stores/ui'
import { readPost } from '@/lib/tauri-bridge'
import type { Post, PostMeta } from '@/types/post'

const posts = usePostsStore()
const ui = useUiStore()

const previewMeta = computed<PostMeta | null>(() => {
  if (!ui.previewId) return null
  return posts.items.find((p) => p.id === ui.previewId) ?? null
})

const full = ref<Post | null>(null)
const loading = ref(false)

const PREVIEW_DEBOUNCE_MS = 120
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inflightToken = 0

function clearDebounce() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function schedulePreview(id: string | null) {
  clearDebounce()
  if (!id) {
    inflightToken += 1
    loading.value = false
    full.value = null
    return
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runPreview(id)
  }, PREVIEW_DEBOUNCE_MS)
}

async function runPreview(id: string) {
  const token = ++inflightToken
  const meta = posts.items.find((p) => p.id === id)
  if (!meta) {
    if (token === inflightToken && ui.previewId === id) {
      full.value = null
      loading.value = false
    }
    return
  }
  loading.value = true
  try {
    const post = await readPost(meta.path)
    if (token === inflightToken && ui.previewId === id) {
      full.value = post
    }
  } catch {
    if (token === inflightToken && ui.previewId === id) {
      full.value = null
    }
  } finally {
    if (token === inflightToken) loading.value = false
  }
}

watch(
  () => ui.previewId,
  (id) => {
    schedulePreview(id)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearDebounce()
  inflightToken += 1
})

const renderedBody = computed(() => {
  const body = full.value?.body
  if (!body) return ''
  return marked.parse(body, { async: false, gfm: true, breaks: false }) as string
})

const dateLabel = computed(() => {
  const meta = previewMeta.value
  if (!meta) return ''
  const iso = meta.scheduledFor ?? meta.publishedAt ?? meta.updatedAt
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

const hookText = computed(() => full.value?.linkedin.hook ?? '')
const ctaText = computed(() => full.value?.linkedin.cta ?? '')
const hashtags = computed(() => full.value?.linkedin.hashtags ?? [])
</script>

<template>
  <aside class="preview" data-testid="post-preview">
    <div v-if="!previewMeta" class="empty" data-testid="preview-empty">
      <p class="muted">Hover a post to preview.</p>
    </div>

    <div v-else class="content" data-testid="preview-content">
      <header class="preview-header">
        <div class="badge-row">
          <span class="badge" :data-status="previewMeta.status">{{ previewMeta.status }}</span>
          <span class="muted">{{ previewMeta.type }}</span>
        </div>
        <h2 class="preview-title">{{ previewMeta.title || 'Untitled' }}</h2>
        <div class="preview-date">{{ dateLabel }}</div>
      </header>

      <section v-if="previewMeta.tags.length" class="preview-section">
        <div class="section-label">Tags</div>
        <div class="tag-row">
          <span v-for="t in previewMeta.tags" :key="t" class="tag">{{ t }}</span>
        </div>
      </section>

      <section v-if="hookText" class="preview-section">
        <div class="section-label">Hook</div>
        <p class="hook">{{ hookText }}</p>
      </section>

      <section class="preview-section">
        <div class="section-label">Body</div>
        <p v-if="loading" class="muted">Loading…</p>
        <div
          v-else-if="renderedBody"
          class="body"
          v-html="renderedBody"
          data-testid="preview-body"
        />
        <p v-else class="muted empty-body">No body yet.</p>
      </section>

      <section v-if="ctaText || hashtags.length" class="preview-section">
        <div v-if="ctaText" class="block">
          <div class="section-label">CTA</div>
          <p class="cta">{{ ctaText }}</p>
        </div>
        <div v-if="hashtags.length" class="block">
          <div class="section-label">Hashtags</div>
          <div class="tag-row">
            <span v-for="h in hashtags" :key="h" class="tag">{{ h }}</span>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.preview {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  background: var(--panel);
  padding: 20px 16px;
  overflow-y: auto;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  font-family: var(--font-sans);
  line-height: 1.3;
}

.preview-date {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.hook,
.cta {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text);
}

.body {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text);
  word-wrap: break-word;
}

.body :deep(h1),
.body :deep(h2),
.body :deep(h3),
.body :deep(h4),
.body :deep(h5),
.body :deep(h6) {
  font-family: var(--font-sans);
  font-weight: 600;
  line-height: 1.3;
  margin: 14px 0 6px;
}

.body :deep(h1) {
  font-size: 16px;
}
.body :deep(h2) {
  font-size: 14px;
}
.body :deep(h3) {
  font-size: 13px;
}
.body :deep(h4),
.body :deep(h5),
.body :deep(h6) {
  font-size: 12px;
}

.body :deep(h1:first-child),
.body :deep(h2:first-child),
.body :deep(h3:first-child) {
  margin-top: 0;
}

.body :deep(p) {
  margin: 0 0 8px;
}

.body :deep(p:last-child) {
  margin-bottom: 0;
}

.body :deep(ul),
.body :deep(ol) {
  margin: 0 0 8px;
  padding-left: 20px;
}

.body :deep(li) {
  margin: 2px 0;
}

.body :deep(li > p) {
  margin: 0 0 4px;
}

.body :deep(strong) {
  font-weight: 600;
  color: var(--text);
}

.body :deep(em) {
  font-style: italic;
}

.body :deep(code) {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--panel-2);
  padding: 1px 4px;
  border-radius: 3px;
  color: var(--accent);
}

.body :deep(pre) {
  margin: 0 0 8px;
  padding: 8px 10px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
}

.body :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  color: var(--text);
  font-size: inherit;
}

.body :deep(blockquote) {
  margin: 0 0 8px;
  padding: 4px 10px;
  border-left: 2px solid var(--border-strong);
  color: var(--text-muted);
  font-style: italic;
}

.body :deep(blockquote > :last-child) {
  margin-bottom: 0;
}

.body :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 12px 0;
}

.body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: var(--accent-ring);
}

.body :deep(a:hover) {
  text-decoration-color: var(--accent);
}

.body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 4px 0;
}

.body :deep(table) {
  border-collapse: collapse;
  margin: 0 0 8px;
  font-size: 11px;
}

.body :deep(th),
.body :deep(td) {
  border: 1px solid var(--border);
  padding: 4px 8px;
  text-align: left;
}

.body :deep(th) {
  background: var(--panel-2);
  font-weight: 600;
}

.body :deep(del) {
  color: var(--text-faint);
}

.empty-body {
  font-style: italic;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
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

.block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
