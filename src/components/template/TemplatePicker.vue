<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { ensureTemplatesDir, listTemplates } from '@/lib/tauri-bridge'
import { listBuiltInTemplates } from '@/lib/templates'
import type { PostType, TemplateMeta } from '@/types/post'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'used', postId: string): void
}>()

const router = useRouter()
const posts = usePostsStore()
const settings = useSettingsStore()

const items = ref<TemplateMeta[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const filter = ref<'all' | PostType>('all')
const selectedSlug = ref<string | null>(null)
const title = ref('')
const creating = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const filtered = computed<TemplateMeta[]>(() => {
  if (filter.value === 'all') return items.value
  return items.value.filter((t) => t.type === filter.value)
})

const selected = computed<TemplateMeta | null>(() => {
  if (!selectedSlug.value) return null
  return items.value.find((t) => t.slug === selectedSlug.value) ?? null
})

async function load() {
  loading.value = true
  error.value = null
  try {
    if (settings.postsFolder) {
      await ensureTemplatesDir(settings.postsFolder)
      items.value = await listTemplates(settings.postsFolder)
    } else {
      items.value = listBuiltInTemplates().map((t) => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        type: t.type,
        tags: t.tags,
        isBuiltIn: true,
        path: null,
      }))
    }
    if (items.value.length > 0) {
      const first = items.value[0]
      if (first) {
        selectedSlug.value = first.slug
        title.value = first.name
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function selectMeta(m: TemplateMeta) {
  selectedSlug.value = m.slug
  title.value = m.name
}

async function onUse() {
  if (!selected.value) return
  if (!settings.postsFolder) {
    error.value = 'pick a posts folder first'
    return
  }
  creating.value = true
  try {
    const post = await posts.createFromTemplate({
      templateSlug: selected.value.slug,
      title: title.value.trim() || selected.value.name,
    })
    emit('used', post.id)
    void router.push({ name: 'editor', params: { id: post.id } })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    creating.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    void onUse()
  }
}

onMounted(async () => {
  await load()
  await nextTick()
  inputRef.value?.focus()
})

watch(filter, () => {
  if (filtered.value.length > 0) {
    const first = filtered.value[0]
    if (first && selectedSlug.value && !filtered.value.find((t) => t.slug === selectedSlug.value)) {
      selectedSlug.value = first.slug
      title.value = first.name
    }
  }
})
</script>

<template>
  <div
    class="popover"
    role="dialog"
    aria-label="Pick a template"
    data-testid="template-picker-popover"
    @keydown="onKey"
  >
    <div class="filter-row" role="tablist" aria-label="Filter by type">
      <button
        type="button"
        class="filter-btn"
        :class="{ active: filter === 'all' }"
        data-testid="template-picker-filter-all"
        @click="filter = 'all'"
      >
        All
      </button>
      <button
        type="button"
        class="filter-btn"
        :class="{ active: filter === 'linkedin' }"
        data-testid="template-picker-filter-linkedin"
        @click="filter = 'linkedin'"
      >
        LinkedIn
      </button>
      <button
        type="button"
        class="filter-btn"
        :class="{ active: filter === 'blog' }"
        data-testid="template-picker-filter-blog"
        @click="filter = 'blog'"
      >
        Blog
      </button>
    </div>

    <ul v-if="filtered.length > 0" class="list" data-testid="template-picker-list">
      <li
        v-for="t in filtered"
        :key="t.slug + (t.isBuiltIn ? ':b' : ':u')"
        class="item"
        :class="{ active: selectedSlug === t.slug }"
        :data-testid="`template-picker-item-${t.slug}`"
        role="button"
        tabindex="0"
        @click="selectMeta(t)"
        @keydown.enter="selectMeta(t)"
      >
        <div class="item-title">
          {{ t.name }}
          <span v-if="t.isBuiltIn" class="badge">built-in</span>
        </div>
        <div class="item-desc muted">{{ t.description || '—' }}</div>
        <div class="item-meta">
          <span class="type">{{ t.type }}</span>
          <span v-for="tag in t.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </li>
    </ul>
    <div v-else-if="loading" class="muted small">Loading…</div>
    <div v-else class="muted small">No templates.</div>

    <form v-if="selected" class="use-form" @submit.prevent="onUse">
      <label class="field">
        <span class="label">Title</span>
        <input
          ref="inputRef"
          v-model="title"
          class="text-input"
          type="text"
          data-testid="template-picker-title"
        />
      </label>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="creating || !title.trim()"
        data-testid="template-picker-use-btn"
        @click="onUse"
      >
        {{ creating ? 'Creating…' : 'Use template' }}
      </button>
    </form>

    <div v-if="error" class="error small" data-testid="template-picker-error">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 380px;
  max-width: 92vw;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 30;
  padding: 10px;
  gap: 10px;
}

.filter-row {
  display: flex;
  gap: 4px;
  padding: 0 2px;
}

.filter-btn {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 4px 8px;
  text-transform: lowercase;
  cursor: pointer;
}

.filter-btn:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.filter-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  max-height: 360px;
  min-height: 60px;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}

.item:hover {
  background: var(--panel-2);
}

.item.active {
  background: var(--panel-2);
  border-color: var(--border-strong);
  box-shadow: inset 2px 0 0 var(--accent);
}

.item:focus-visible {
  outline: none;
  background: var(--panel-2);
  border-color: var(--border-strong);
}

.item-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}

.item-desc {
  font-size: 11px;
  line-height: 1.4;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.type,
.tag,
.badge {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
}

.type {
  color: var(--text-faint);
  border: 1px solid var(--border);
  text-transform: lowercase;
}

.tag {
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.badge {
  color: var(--accent);
  border: 1px solid var(--accent-soft);
  background: var(--accent-soft);
}

.use-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.text-input {
  padding: 6px 10px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.small {
  font-size: 11px;
}

.error {
  padding: 6px 8px;
  border: 1px solid var(--danger-soft);
  background: var(--danger-bg);
  color: var(--danger);
  border-radius: var(--radius);
}
</style>
