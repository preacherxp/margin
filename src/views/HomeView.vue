<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useGlobalShortcuts } from '@/lib/useGlobalShortcuts'
import { useToasts } from '@/lib/useToasts'
import Sidebar from '@/components/shell/Sidebar.vue'
import PostCard from '@/components/post/PostCard.vue'
import PostPreview from '@/components/post/PostPreview.vue'
import TemplatePicker from '@/components/template/TemplatePicker.vue'
import PostListSkeleton from '@/components/ui/PostListSkeleton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import Shortcut from '@/components/ui/Shortcut.vue'
import { SHORTCUT, shortcutLabel } from '@/lib/useGlobalShortcuts'
import { shortcutTitle } from '@/lib/shortcuts'
import type { PostMeta } from '@/types/post'

const settings = useSettingsStore()
const posts = usePostsStore()
const ui = useUiStore()
const router = useRouter()
const toasts = useToasts()

const isPicking = ref(false)
const isCreating = ref(false)
const newTitle = ref('')
const newType = ref<'linkedin' | 'blog'>('linkedin')
const listSearch = ref('')
const pickerOpen = ref(false)
const pickerAnchor = ref<HTMLElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)

const hasFolder = computed(() => !!settings.postsFolder)
const typeOptions = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'blog', label: 'Blog' },
]

useGlobalShortcuts({
  onNewPost: () => {
    if (!hasFolder.value) {
      void onChooseFolder()
      return
    }
    void nextTick(() => titleInput.value?.focus())
  },
})

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onPickerKey)
})

watch(hasFolder, async (has) => {
  if (has) await posts.refresh()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onPickerKey)
})

watch(listSearch, (q) => ui.setSearch(q))

const filtered = computed<PostMeta[]>(() => {
  const q = listSearch.value.trim().toLowerCase()
  const status = ui.statusFilter
  const tags = ui.tagFilters

  let out = posts.items

  if (status !== 'all') {
    out = out.filter((p) => p.status === status)
  }
  if (tags.length > 0) {
    out = out.filter((p) => tags.every((t) => p.tags.includes(t)))
  }
  if (q) {
    out = out.filter((p) => {
      if (p.title.toLowerCase().includes(q)) return true
      if (p.tags.some((t) => t.toLowerCase().includes(q))) return true
      return false
    })
  }

  const sorted = [...out]
  const key = ui.sortKey
  sorted.sort((a, b) => {
    if (key === 'created') return b.createdAt.localeCompare(a.createdAt)
    if (key === 'scheduled') {
      const av = a.scheduledFor ?? ''
      const bv = b.scheduledFor ?? ''
      if (!av && !bv) return b.updatedAt.localeCompare(a.updatedAt)
      if (!av) return 1
      if (!bv) return -1
      return av.localeCompare(bv)
    }
    return b.updatedAt.localeCompare(a.updatedAt)
  })
  return sorted
})

async function onChooseFolder() {
  isPicking.value = true
  try {
    await settings.chooseFolder()
    if (settings.postsFolder) await posts.refresh()
  } finally {
    isPicking.value = false
  }
}

async function onRefresh() {
  await posts.refresh()
}

async function onCreate() {
  const title = newTitle.value.trim()
  if (!title) return
  isCreating.value = true
  try {
    const post = await posts.create({ title, type: newType.value })
    newTitle.value = ''
    toasts.success('Post created')
    void router.push({ name: 'editor', params: { id: post.id } })
  } catch (e) {
    toasts.error(e instanceof Error ? e.message : String(e))
  } finally {
    isCreating.value = false
  }
}

function openPost(meta: PostMeta) {
  void router.push({ name: 'editor', params: { id: meta.id } })
}

function previewPost(meta: PostMeta) {
  ui.setPreview(meta.id)
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    const first = filtered.value[0]
    if (first) openPost(first)
  }
}

async function togglePicker() {
  pickerOpen.value = !pickerOpen.value
  if (pickerOpen.value) {
    await nextTick()
  }
}

function closePicker() {
  pickerOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (!pickerOpen.value) return
  const target = e.target as Node | null
  if (!target) return
  if (pickerAnchor.value && pickerAnchor.value.contains(target)) return
  const popover = document.querySelector('[data-testid="template-picker-popover"]')
  if (popover && popover.contains(target)) return
  closePicker()
}

function onPickerKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && pickerOpen.value) {
    e.stopPropagation()
    closePicker()
  }
}
</script>

<template>
  <section class="home" data-testid="home-view">
    <div v-if="!hasFolder" class="empty" data-testid="empty-state">
      <h2>Pick a folder to store your posts</h2>
      <p class="muted">
        Posts are saved as <code>.md</code> files with YAML frontmatter in the folder you choose.
        You can keep them in iCloud, Dropbox, or anywhere on disk.
      </p>
      <button
        class="btn btn-primary"
        :disabled="isPicking"
        data-testid="choose-folder-btn"
        @click="onChooseFolder"
      >
        <AppIcon name="folder" />
        {{ isPicking ? 'Picking…' : 'Choose Folder' }}
      </button>
    </div>

    <div v-else class="three-pane" data-testid="three-pane">
      <Sidebar />

      <main class="list-pane" data-testid="list-pane">
        <header class="list-header">
          <h1 class="list-title">Posts</h1>
          <div class="list-actions">
            <button
              class="btn btn-ghost toolbar-shortcut"
              :disabled="posts.loading"
              data-testid="refresh-btn"
              :title="posts.loading ? 'Loading…' : shortcutTitle('Refresh', SHORTCUT.refresh)"
              aria-label="Refresh"
              @click="onRefresh"
            >
              <AppIcon name="refresh" />
              <Shortcut :keys="SHORTCUT.refresh" />
            </button>
            <button
              class="btn btn-ghost toolbar-shortcut"
              data-testid="open-palette-btn"
              :title="shortcutTitle('Open Command Palette', SHORTCUT.commandPalette)"
              aria-label="Open Command Palette"
              @click="ui.openPalette"
            >
              <AppIcon name="search" />
              <Shortcut :keys="SHORTCUT.commandPalette" />
            </button>
            <button
              class="btn btn-ghost toolbar-shortcut"
              data-testid="open-shortcuts-btn"
              :title="shortcutTitle('Keyboard Shortcuts', SHORTCUT.shortcuts)"
              aria-label="Keyboard Shortcuts"
              @click="ui.openShortcuts"
            >
              <AppIcon name="keyboard" />
              <Shortcut :keys="SHORTCUT.shortcuts" />
            </button>
            <button
              class="btn btn-ghost"
              data-testid="change-folder-btn"
              @click="settings.clearFolder"
            >
              Change Folder
            </button>
          </div>
        </header>

        <form class="new-post" @submit.prevent="onCreate">
          <input
            ref="titleInput"
            v-model="newTitle"
            class="title-input"
            placeholder="New post title…"
            aria-label="New post title"
            data-testid="new-post-title"
          />
          <AppSelect
            v-model="newType"
            class="type-select"
            :options="typeOptions"
            aria-label="Post Type"
            data-testid="new-post-type"
          />
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="isCreating || !newTitle.trim()"
            data-testid="create-post-btn"
          >
            <AppIcon name="file-plus" />
            {{ isCreating ? 'Creating…' : 'Create' }}
            <Shortcut v-if="!isCreating" :keys="SHORTCUT.newPost" />
          </button>
          <div ref="pickerAnchor" class="picker-anchor">
            <button
              type="button"
              class="btn"
              :aria-expanded="pickerOpen"
              data-testid="new-post-template-btn"
              @click="togglePicker"
            >
              From Template…
            </button>
            <TemplatePicker
              v-if="pickerOpen"
              @close="closePicker"
              @used="closePicker"
            />
          </div>
        </form>

        <div class="quick-search">
          <input
            v-model="listSearch"
            class="search-input"
            type="search"
            placeholder="Filter by title or tag…"
            aria-label="Filter posts"
            data-testid="list-search-input"
            @keydown="onSearchKeydown"
          />
          <span v-if="ui.hasActiveFilters" class="filter-summary" data-testid="filter-summary">
            {{ filtered.length }} of {{ posts.count }}
          </span>
        </div>

        <div v-if="posts.error" class="error" data-testid="error-banner">{{ posts.error }}</div>

        <PostListSkeleton v-if="posts.loading && posts.items.length === 0" />

        <ul
          v-else-if="filtered.length > 0"
          class="post-list"
          data-testid="post-list"
        >
          <PostCard
            v-for="p in filtered"
            :key="p.id"
            :post="p"
            :active="ui.previewId === p.id"
            :query="listSearch"
            @open="openPost"
            @preview="previewPost"
          />
        </ul>

        <div
          v-else-if="ui.hasActiveFilters"
          class="empty small"
          data-testid="no-matches-empty"
        >
          <p class="muted">No posts match your filters.</p>
          <button class="btn" data-testid="clear-filters-btn" @click="ui.clearFilters">
            Clear Filters
          </button>
        </div>

        <div v-else class="empty small" data-testid="no-posts-empty">
          <p class="muted">
            No posts yet. Create your first one above or press
            <kbd class="key">{{ shortcutLabel(SHORTCUT.newPost) }}</kbd>.
          </p>
        </div>
      </main>

      <PostPreview />
    </div>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.empty {
  margin: auto;
  max-width: 480px;
  text-align: center;
  padding: 32px 0;
}

.empty.small {
  margin: 16px 0;
  padding: 8px 0;
}

.empty h2 {
  font-family: var(--font-mono);
  font-size: 16px;
  margin: 0 0 8px;
}

.empty .btn {
  margin-top: 16px;
}

.empty code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--panel-2);
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.three-pane {
  display: flex;
  flex: 1;
  min-height: 0;
}

.list-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px 20px;
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.list-title {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.list-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.toolbar-shortcut {
  padding-inline: 9px 10px;
}

.new-post {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  align-items: stretch;
}

.title-input,
.search-input {
  flex: 1;
  min-width: 200px;
  height: 29px;
  padding: 0 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font: 500 13px/1 var(--font-sans);
}

.title-input:focus,
.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 3.5px var(--accent-ring);
}

.type-select {
  width: 176px;
}

.picker-anchor {
  position: relative;
}

.quick-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.filter-summary {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
  white-space: nowrap;
}

.post-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.error {
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--danger-soft);
  background: var(--danger-bg);
  color: var(--danger);
  border-radius: var(--radius);
  font-size: 12px;
}
</style>
