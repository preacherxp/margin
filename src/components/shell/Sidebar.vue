<script setup lang="ts">
import { computed } from 'vue'
import { usePostsStore } from '@/stores/posts'
import { useUiStore, type SortKey, type StatusFilter } from '@/stores/ui'
import Shortcut from '@/components/ui/Shortcut.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { SHORTCUT } from '@/lib/useGlobalShortcuts'
import type { PostStatus } from '@/types/post'

defineOptions({ name: 'AppSidebar' })

const posts = usePostsStore()
const ui = useUiStore()

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Updated' },
  { value: 'created', label: 'Created' },
  { value: 'scheduled', label: 'Scheduled' },
]

const allTags = computed(() => {
  const set = new Set<string>()
  for (const p of posts.items) for (const t of p.tags) set.add(t)
  return Array.from(set).sort()
})

const counts = computed(() => posts.byStatus)
const total = computed(() => posts.count)

function countFor(value: StatusFilter): number {
  if (value === 'all') return total.value
  return counts.value[value as PostStatus] ?? 0
}

function onStatus(value: StatusFilter) {
  ui.setStatus(value)
}

function onTagClick(tag: string) {
  ui.toggleTag(tag)
}
</script>

<template>
  <aside class="sidebar" data-testid="home-sidebar">
    <div class="section">
      <div class="section-title">Status</div>
      <ul class="status-list">
        <li v-for="opt in STATUS_OPTIONS" :key="opt.value">
          <button
            class="status-btn"
            :class="{ active: ui.statusFilter === opt.value }"
            :data-testid="`status-filter-${opt.value}`"
            @click="onStatus(opt.value)"
          >
            <span class="status-label">{{ opt.label }}</span>
            <span class="status-count">{{ countFor(opt.value) }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div class="section">
      <div class="section-title-row">
        <div class="section-title">Tags</div>
        <button
          v-if="ui.tagFilters.length > 0"
          class="clear-btn"
          data-testid="clear-tags-btn"
          @click="ui.clearTags"
        >
          Clear
        </button>
      </div>
      <div v-if="allTags.length === 0" class="empty-tags muted">No tags yet</div>
      <div v-else class="tag-chips">
        <button
          v-for="tag in allTags"
          :key="tag"
          class="chip"
          :class="{ active: ui.tagFilters.includes(tag) }"
          :data-testid="`tag-chip-${tag}`"
          @click="onTagClick(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Sort</div>
      <AppSelect
        :model-value="ui.sortKey"
        class="sort-select"
        :options="SORT_OPTIONS"
        aria-label="Sort Posts"
        data-testid="sort-select"
        compact
        @update:model-value="ui.setSort($event as SortKey)"
      />
    </div>

    <div class="section hint-section">
      <div class="section-title">Tip</div>
      <p class="muted">
        Press <Shortcut :keys="SHORTCUT.commandPalette" treatment="keycap" /> to search posts.
      </p>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--panel);
  padding: 16px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  padding: 0 4px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-faint);
  font-size: 10px;
  font-family: var(--font-mono);
  cursor: pointer;
  padding: 0;
}

.clear-btn:hover {
  color: var(--accent);
}

.status-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.status-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: 12px;
  text-align: left;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}

.status-btn:hover {
  background: var(--panel-2);
  color: var(--text);
}

.status-btn.active {
  background: var(--panel-2);
  color: var(--text);
  box-shadow: inset 2px 0 0 var(--accent);
}

.status-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-faint);
}

.empty-tags {
  font-size: 11px;
  padding: 4px;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 4px;
}

.chip {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 7px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    border-color var(--dur) var(--ease),
    color var(--dur) var(--ease);
}

.chip:hover {
  border-color: var(--accent);
  color: var(--text);
}

.chip.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.sort-select {
  margin: 0 4px;
}

.hint-section p {
  font-size: 11px;
  margin: 0;
  line-height: 1.5;
}
</style>
