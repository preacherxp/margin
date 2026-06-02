<script setup lang="ts">
import { computed } from 'vue'
import type { PostMeta } from '@/types/post'

const props = defineProps<{
  post: PostMeta
  active?: boolean
  query?: string
}>()

const emit = defineEmits<{
  (e: 'open', post: PostMeta): void
  (e: 'preview', post: PostMeta): void
}>()

const dateLabel = computed(() => {
  const iso = props.post.scheduledFor ?? props.post.updatedAt
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
})
</script>

<template>
  <li
    class="card"
    :class="{ active }"
    role="link"
    tabindex="0"
    data-testid="post-card"
    :data-post-id="post.id"
    :data-post-title="post.title"
    :data-post-status="post.status"
    @click="emit('open', post)"
    @keydown.enter="emit('open', post)"
    @mouseenter="emit('preview', post)"
    @focus="emit('preview', post)"
  >
    <div class="card-main">
      <div class="card-title">{{ post.title || 'Untitled' }}</div>
      <div class="card-meta">
        <span class="badge" :data-status="post.status">{{ post.status }}</span>
        <span class="faint">·</span>
        <span class="muted">{{ post.type }}</span>
        <span class="faint">·</span>
        <span class="muted">{{ dateLabel }}</span>
      </div>
      <div v-if="post.tags.length" class="card-tags">
        <span v-for="t in post.tags" :key="t" class="tag">{{ t }}</span>
      </div>
    </div>
    <span class="chev" aria-hidden="true">›</span>
  </li>
</template>

<style scoped>
.card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}

.card:hover {
  background: var(--panel);
}

.card:focus-visible {
  outline: none;
  background: var(--panel);
  border-color: var(--border-strong);
}

.card.active {
  background: var(--panel-2);
  border-color: var(--border-strong);
  box-shadow: inset 2px 0 0 var(--accent);
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 13px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  flex-wrap: wrap;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
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

.tag {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.chev {
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 18px;
  line-height: 1;
  align-self: center;
  flex-shrink: 0;
}
</style>
