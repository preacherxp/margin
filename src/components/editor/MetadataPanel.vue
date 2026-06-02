<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LinkedinMeta, Post, PostStatus, PostType } from '@/types/post'
import AppSelect from '@/components/ui/AppSelect.vue'

const props = defineProps<{
  post: Post
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:status', value: PostStatus): void
  (e: 'update:type', value: PostType): void
  (e: 'update:tags', value: string[]): void
  (e: 'update:linkedin', value: LinkedinMeta): void
  (e: 'update:scheduledFor', value: string | null): void
}>()

const tagInput = ref('')
const isAddingTag = ref(false)

const hashtagsText = computed({
  get: () => props.post.linkedin.hashtags.join(' '),
  set: (val: string) => {
    const tags = val
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('#') ? s : `#${s}`))
    emit('update:linkedin', { ...props.post.linkedin, hashtags: tags })
  },
})

const showLinkedin = computed(() => props.post.type === 'linkedin')

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const typeOptions = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'blog', label: 'Blog' },
]

function onTitleInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:title', value)
}

function onHookInput(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  emit('update:linkedin', { ...props.post.linkedin, hook: value })
}

function onCtaInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:linkedin', { ...props.post.linkedin, cta: value })
}

function onAudienceInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:linkedin', { ...props.post.linkedin, audience: value })
}

function onScheduleInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:scheduledFor', value ? new Date(value).toISOString() : null)
}

const scheduledLocal = computed(() => {
  if (!props.post.scheduledFor) return ''
  const d = new Date(props.post.scheduledFor)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
})

function addTag() {
  const t = tagInput.value.trim().toLowerCase().replace(/^#/, '')
  if (!t) return
  if (props.post.tags.includes(t)) {
    tagInput.value = ''
    isAddingTag.value = false
    return
  }
  emit('update:tags', [...props.post.tags, t])
  tagInput.value = ''
  isAddingTag.value = false
}

function removeTag(t: string) {
  emit(
    'update:tags',
    props.post.tags.filter((x) => x !== t),
  )
}

function onTagKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  } else if (e.key === 'Escape') {
    tagInput.value = ''
    isAddingTag.value = false
  }
}
</script>

<template>
  <aside class="meta-panel" data-testid="meta-panel">
    <div class="field">
      <label class="label" for="title-input">Title</label>
      <input
        id="title-input"
        class="text-input"
        :value="post.title"
        placeholder="Untitled post"
        data-testid="title-input"
        @input="onTitleInput"
      />
    </div>

    <div class="row">
      <div class="field flex">
        <label class="label" for="status-select">Status</label>
        <AppSelect
          id="status-select"
          :model-value="post.status"
          :options="statusOptions"
          aria-label="Status"
          data-testid="status-select"
          compact
          @update:model-value="emit('update:status', $event as PostStatus)"
        />
      </div>
      <div class="field flex">
        <label class="label" for="type-select">Type</label>
        <AppSelect
          id="type-select"
          :model-value="post.type"
          :options="typeOptions"
          aria-label="Type"
          data-testid="type-select"
          compact
          @update:model-value="emit('update:type', $event as PostType)"
        />
      </div>
    </div>

    <div v-if="post.status === 'scheduled'" class="field" data-testid="schedule-field">
      <label class="label" for="schedule-input">Scheduled for</label>
      <input
        id="schedule-input"
        type="datetime-local"
        class="text-input"
        :value="scheduledLocal"
        data-testid="schedule-input"
        @input="onScheduleInput"
      />
    </div>

    <div class="field">
      <label class="label">Tags</label>
      <div class="tag-row" data-testid="tags-row">
        <span
          v-for="t in post.tags"
          :key="t"
          class="tag-chip"
          data-testid="tag-chip"
          :data-tag="t"
        >
          {{ t }}
          <button
            class="tag-remove"
            :aria-label="`remove ${t}`"
            :data-tag-remove="t"
            @click="removeTag(t)"
          >
            ×
          </button>
        </span>
        <input
          v-if="isAddingTag"
          v-model="tagInput"
          class="tag-input"
          placeholder="add tag…"
          data-testid="tag-input"
          @keydown="onTagKey"
          @blur="addTag"
        />
        <button
          v-else
          class="tag-add"
          data-testid="tag-add-btn"
          @click="isAddingTag = true"
        >
          + tag
        </button>
      </div>
    </div>

    <template v-if="showLinkedin">
      <div class="divider" />
      <h3 class="section-title">LinkedIn</h3>

      <div class="field" data-testid="linkedin-section">
        <label class="label" for="hook-input">Hook</label>
        <textarea
          id="hook-input"
          class="text-input textarea"
          rows="2"
          :value="post.linkedin.hook"
          placeholder="The first line. The scroll-stopper."
          data-testid="hook-input"
          @input="onHookInput"
        />
      </div>

      <div class="field">
        <label class="label" for="cta-input">CTA</label>
        <input
          id="cta-input"
          class="text-input"
          :value="post.linkedin.cta"
          placeholder="What do you want readers to do?"
          data-testid="cta-input"
          @input="onCtaInput"
        />
      </div>

      <div class="field">
        <label class="label" for="audience-input">Audience</label>
        <input
          id="audience-input"
          class="text-input"
          :value="post.linkedin.audience"
          placeholder="Who is this for?"
          data-testid="audience-input"
          @input="onAudienceInput"
        />
      </div>

      <div class="field">
        <label class="label" for="hashtags-input">Hashtags</label>
        <input
          id="hashtags-input"
          class="text-input"
          v-model="hashtagsText"
          placeholder="#ai #career"
          data-testid="hashtags-input"
        />
      </div>
    </template>
  </aside>
</template>

<style scoped>
.meta-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 16px;
  background: var(--panel);
  border-left: 1px solid var(--border);
  width: 280px;
  flex: 0 0 280px;
  overflow: auto;
  font-size: 13px;
}

.label {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.section-title {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
}

.field.flex {
  flex: 1;
}

.row {
  display: flex;
  gap: 8px;
}

.text-input {
  width: 100%;
  padding: 6px 8px;
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

.textarea {
  resize: vertical;
  min-height: 56px;
  font-family: inherit;
  line-height: 1.5;
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--panel-2);
}

.tag-remove {
  background: none;
  border: none;
  color: var(--text-faint);
  padding: 0;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.tag-remove:hover {
  color: var(--danger);
}

.tag-input {
  flex: 1;
  min-width: 80px;
  padding: 2px 6px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font: inherit;
  font-size: 12px;
}

.tag-add {
  background: none;
  border: 1px dashed var(--border-strong);
  color: var(--text-faint);
  font-size: 11px;
  font-family: var(--font-mono);
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.tag-add:hover {
  color: var(--text);
  border-color: var(--accent);
}
</style>
