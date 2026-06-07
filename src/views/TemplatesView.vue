<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '@/stores/posts'
import { useSettingsStore } from '@/stores/settings'
import { ensureTemplatesDir, listTemplates, readTemplateBySlug } from '@/lib/tauri-bridge'
import { listBuiltInTemplates } from '@/lib/templates'
import ListSkeleton from '@/components/ui/ListSkeleton.vue'
import type { Template, TemplateMeta, PostType } from '@/types/post'

defineOptions({ name: 'TemplatesView' })

const router = useRouter()
const posts = usePostsStore()
const settings = useSettingsStore()

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<TemplateMeta[]>([])
const filter = ref<'all' | PostType>('all')
const activeSlug = ref<string | null>(null)
const active = ref<Template | null>(null)
const activeLoading = ref(false)
const newTitle = ref('')
const creating = ref(false)

const hasFolder = computed(() => !!settings.postsFolder)

const filtered = computed<TemplateMeta[]>(() => {
  if (filter.value === 'all') return items.value
  return items.value.filter((t) => t.type === filter.value)
})

const builtInCount = computed(() => items.value.filter((t) => t.isBuiltIn).length)
const userCount = computed(() => items.value.filter((t) => !t.isBuiltIn).length)

async function loadList() {
  if (!settings.postsFolder) {
    items.value = listBuiltInTemplates().map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      type: t.type,
      tags: t.tags,
      isBuiltIn: true,
      path: null,
    }))
    return
  }
  loading.value = true
  error.value = null
  try {
    await ensureTemplatesDir(settings.postsFolder)
    items.value = await listTemplates(settings.postsFolder)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    items.value = listBuiltInTemplates().map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      type: t.type,
      tags: t.tags,
      isBuiltIn: true,
      path: null,
    }))
  } finally {
    loading.value = false
  }
}

async function pickTemplate(meta: TemplateMeta) {
  activeSlug.value = meta.slug
  activeLoading.value = true
  newTitle.value = meta.name
  try {
    if (!settings.postsFolder) {
      const built = listBuiltInTemplates().find((t) => t.slug === meta.slug)
      active.value = built ?? null
    } else {
      active.value = await readTemplateBySlug(meta.slug, settings.postsFolder)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    active.value = null
  } finally {
    activeLoading.value = false
  }
}

async function useTemplate() {
  if (!active.value) return
  if (!settings.postsFolder) {
    error.value = 'pick a posts folder first'
    return
  }
  creating.value = true
  try {
    const post = await posts.createFromTemplate({
      templateSlug: active.value.slug,
      title: newTitle.value.trim() || active.value.name,
    })
    void router.push({ name: 'editor', params: { id: post.id } })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    creating.value = false
  }
}

function onFilterClick(value: 'all' | PostType) {
  filter.value = value
  if (filtered.value.length > 0) {
    const first = filtered.value[0]
    if (first) void pickTemplate(first)
  } else {
    activeSlug.value = null
    active.value = null
  }
}

onMounted(async () => {
  if (!settings.initialized) await settings.init()
  await loadList()
  if (items.value.length > 0) {
    const first = items.value[0]
    if (first) void pickTemplate(first)
  }
})

watch(
  () => settings.postsFolder,
  () => {
    void loadList()
  },
)

const bodyPreview = computed(() => {
  if (!active.value) return ''
  return active.value.body.replace(/\s+/g, ' ').trim().slice(0, 400)
})
</script>

<template>
  <section class="templates" data-testid="templates-view">
    <header class="header" data-testid="templates-header">
      <div>
        <h1 class="title">Templates</h1>
        <p class="muted small">
          {{ builtInCount }} built-in{{ userCount ? ` · ${userCount} yours` : '' }}
        </p>
      </div>
      <div class="header-actions">
        <button
          class="btn btn-ghost"
          type="button"
          data-testid="templates-back-btn"
          @click="router.push({ name: 'home' })"
        >
          ← Posts
        </button>
      </div>
    </header>

    <div v-if="!hasFolder" class="empty" data-testid="templates-no-folder">
      <p class="muted">Pick a posts folder from the home view to create posts from templates.</p>
    </div>

    <div v-else class="body" data-testid="templates-body">
      <aside class="sidebar" data-testid="templates-sidebar">
        <div class="filter-row" role="tablist" aria-label="Filter by type">
          <button
            class="filter-btn"
            :class="{ active: filter === 'all' }"
            data-testid="templates-filter-all"
            @click="onFilterClick('all')"
          >
            All
          </button>
          <button
            class="filter-btn"
            :class="{ active: filter === 'linkedin' }"
            data-testid="templates-filter-linkedin"
            @click="onFilterClick('linkedin')"
          >
            LinkedIn
          </button>
          <button
            class="filter-btn"
            :class="{ active: filter === 'blog' }"
            data-testid="templates-filter-blog"
            @click="onFilterClick('blog')"
          >
            Blog
          </button>
        </div>

        <div v-if="loading" class="skel-wrap" data-testid="templates-loading">
          <ListSkeleton :count="4" :lines="2" />
        </div>

        <div v-else-if="filtered.length === 0" class="empty small" data-testid="templates-empty">
          <p class="muted">No templates match this filter.</p>
        </div>

        <ul v-else class="list" data-testid="templates-list">
          <li
            v-for="t in filtered"
            :key="t.slug + (t.isBuiltIn ? ':b' : ':u')"
            class="item"
            :class="{ active: activeSlug === t.slug }"
            :data-testid="`template-item-${t.slug}`"
            role="button"
            tabindex="0"
            @click="pickTemplate(t)"
            @keydown.enter="pickTemplate(t)"
          >
            <div class="item-main">
              <div class="item-title">
                {{ t.name }}
                <span v-if="t.isBuiltIn" class="badge" data-testid="template-builtin-badge"
                  >built-in</span
                >
                <span v-else class="badge user">yours</span>
              </div>
              <div class="item-desc muted">{{ t.description || '—' }}</div>
              <div class="item-meta">
                <span class="type">{{ t.type }}</span>
                <span v-for="tag in t.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </li>
        </ul>
      </aside>

      <div class="preview" data-testid="template-preview">
        <div v-if="!active && !activeLoading" class="empty">
          <p class="muted">Pick a template to preview it.</p>
        </div>

        <div v-else-if="activeLoading" class="muted small" data-testid="template-preview-loading">
          Loading template…
        </div>

        <div v-else-if="active" class="preview-content" data-testid="template-preview-content">
          <header class="preview-header">
            <h2 class="preview-title">{{ active.name }}</h2>
            <p class="muted">{{ active.description }}</p>
            <div class="preview-meta">
              <span class="type">{{ active.type }}</span>
              <span v-for="tag in active.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </header>

          <section class="preview-section" data-testid="template-body-preview">
            <div class="section-label">Body preview</div>
            <pre class="body">{{ bodyPreview || '(empty)' }}</pre>
          </section>

          <section v-if="active.type === 'linkedin'" class="preview-section">
            <div class="section-label">LinkedIn defaults</div>
            <dl class="kv">
              <div v-if="active.linkedin.cta">
                <dt>CTA</dt>
                <dd>{{ active.linkedin.cta }}</dd>
              </div>
              <div v-if="active.linkedin.audience">
                <dt>Audience</dt>
                <dd>{{ active.linkedin.audience }}</dd>
              </div>
              <div v-if="active.linkedin.hashtags.length">
                <dt>Hashtags</dt>
                <dd class="tag-row">
                  <span v-for="h in active.linkedin.hashtags" :key="h" class="tag">{{ h }}</span>
                </dd>
              </div>
            </dl>
          </section>

          <form class="use-form" @submit.prevent="useTemplate">
            <label class="field">
              <span class="label">New post title</span>
              <input
                v-model="newTitle"
                class="text-input"
                type="text"
                placeholder="Title for the new post"
                data-testid="template-use-title"
              />
            </label>
            <button
              class="btn btn-primary"
              type="submit"
              :disabled="creating"
              data-testid="template-use-btn"
            >
              {{ creating ? 'Creating…' : 'Use this template' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <div v-if="error" class="error" data-testid="templates-error">
      <span>{{ error }}</span>
      <button class="btn" type="button" @click="error = null">Dismiss</button>
    </div>
  </section>
</template>

<style scoped>
.templates {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}

.title {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.small {
  font-size: 11px;
  margin: 4px 0 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sidebar {
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--panel);
  padding: 14px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row {
  display: flex;
  gap: 4px;
  padding: 0 4px;
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
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 10px;
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
  font-size: 13px;
  font-weight: 500;
}

.item-desc {
  font-size: 11px;
  line-height: 1.4;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.type,
.tag,
.badge {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 1px 6px;
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

.badge.user {
  color: var(--text-faint);
  border-color: var(--border);
  background: var(--panel);
}

.preview {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
  min-width: 0;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 720px;
  margin: 0 auto;
}

.preview-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-title {
  font-family: var(--font-mono);
  font-size: 22px;
  margin: 0;
  font-weight: 600;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
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

.body {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.kv {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.kv div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.kv dt {
  flex: 0 0 90px;
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin: 0;
}

.kv dd {
  flex: 1;
  margin: 0;
  color: var(--text);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.use-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  padding: 8px 12px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font: inherit;
  font-size: 13px;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.empty {
  margin: auto;
  padding: 40px 20px;
  text-align: center;
}

.error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-top: 1px solid var(--danger-soft);
  background: var(--danger-bg);
  color: var(--danger);
  font-size: 12px;
}

.skel-wrap {
  padding: 0 4px;
}

.empty.small {
  margin: 16px 0;
  padding: 8px 0;
}
</style>
