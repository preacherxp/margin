<script setup lang="ts">
import { computed } from 'vue'
import type { AutosaveStatus } from '@/lib/tiptap/useDebouncedAutoSave'
import type { PostStats } from '@/lib/tiptap/stats'

const props = defineProps<{
  status: AutosaveStatus
  stats: PostStats
  path: string | null
}>()

const statusLabel = computed(() => {
  switch (props.status) {
    case 'idle':
      return 'Ready'
    case 'pending':
      return 'Editing…'
    case 'saving':
      return 'Saving…'
    case 'saved':
      return 'Saved'
    case 'error':
      return 'Save failed'
    default:
      return ''
  }
})
</script>

<template>
  <footer class="status-bar" data-testid="status-bar">
    <span class="dot" :data-status="status" />
    <span class="label" data-testid="save-status">{{ statusLabel }}</span>
    <span class="sep">·</span>
    <span class="metric" data-testid="word-count">{{ stats.words }} words</span>
    <span class="sep">·</span>
    <span class="metric" data-testid="char-count">{{ stats.chars }} chars</span>
    <span class="sep">·</span>
    <span class="metric" data-testid="read-time">~{{ stats.readMinutes }} min read</span>
    <span
      v-if="path"
      class="path"
      data-testid="status-bar-path"
      :title="path"
    >{{ path }}</span>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-top: 1px solid var(--border);
  background: var(--panel);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  flex: 0 0 auto;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-faint);
}

.dot[data-status='pending'] {
  background: var(--warning);
}

.dot[data-status='saving'] {
  background: var(--accent);
  animation: pulse 1.2s ease-in-out infinite;
}

.dot[data-status='saved'] {
  background: var(--success);
}

.dot[data-status='error'] {
  background: var(--danger);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.label {
  color: var(--text);
}

.sep {
  color: var(--text-faint);
}

.metric {
  color: var(--text-muted);
}

.path {
  margin-left: auto;
  color: var(--text-faint);
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
