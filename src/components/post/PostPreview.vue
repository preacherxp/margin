<script setup lang="ts">
import { computed } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useUiStore } from '@/stores/ui'
import { readPost } from '@/lib/tauri-bridge'
import { ref, watch } from 'vue'
import type { Post, PostMeta } from '@/types/post'

const posts = usePostsStore()
const ui = useUiStore()

const previewMeta = computed<PostMeta | null>(() => {
  if (!ui.previewId) return null
  return posts.items.find((p) => p.id === ui.previewId) ?? null
})

const full = ref<Post | null>(null)
const loading = ref(false)

async function loadPreview(id: string | null) {
  if (!id) {
    full.value = null
    return
  }
  const meta = posts.items.find((p) => p.id === id)
  if (!meta) {
    full.value = null
    return
  }
  loading.value = true
  try {
    full.value = await readPost(meta.path)
  } catch {
    full.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => ui.previewId,
  (id) => {
    void loadPreview(id)
  },
  { immediate: true },
)

const snippet = computed(() => {
  if (!full.value) return ''
  return full.value.body.replace(/\s+/g, ' ').trim().slice(0, 320)
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
        <p v-else-if="snippet" class="body">{{ snippet }}</p>
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
.body,
.cta {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text);
}

.body {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  white-space: pre-wrap;
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
