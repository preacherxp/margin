<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'
import { usePostEditor } from '@/lib/tiptap/usePostEditor'
import { computeStats, type PostStats } from '@/lib/tiptap/stats'
import { resolveImageSrc } from '@/lib/tiptap/imageSource'
import { useImageDrop } from '@/lib/tiptap/useImageDrop'

const props = defineProps<{
  modelValue: string
  postsDir: string | null
  placeholder?: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'asset-added', relPath: string): void
}>()

const { editor, isReady } = usePostEditor({
  placeholder: props.placeholder,
  initialMarkdown: props.modelValue,
  editable: !props.readonly,
  onUpdate: (md) => emit('update:modelValue', md),
})

useImageDrop({
  editor,
  postsDir: toRef(props, 'postsDir'),
  onAssetAdded: (rel) => emit('asset-added', rel),
})

const rootEl = ref<HTMLElement | null>(null)

const stats = computed<PostStats>(() => computeStats(props.modelValue ?? ''))

watch(
  () => props.modelValue,
  (next) => {
    const ed = editor.value
    if (!ed) return
    const storage = ed.storage as { markdown?: { getMarkdown?: () => string } }
    if (storage.markdown?.getMarkdown) {
      const current = storage.markdown.getMarkdown()
      if (current === next) return
    }
    ed.commands.setContent(next ?? '', { emitUpdate: false })
  },
)

watch(
  () => props.readonly,
  (ro) => {
    const ed = editor.value
    if (!ed) return
    ed.setEditable(!ro)
  },
)

function patchImageSources(node: HTMLElement, dir: string | null) {
  if (!dir) return
  const imgs = node.querySelectorAll('img')
  imgs.forEach((img) => {
    const src = img.getAttribute('src')
    if (!src) return
    const resolved = resolveImageSrc(src, { postsDir: dir })
    if (resolved !== src) img.setAttribute('src', resolved)
  })
}

onMounted(() => {
  const ed = editor.value
  if (ed) applyImagePatch(ed, props.postsDir)
})

watch(
  () => props.postsDir,
  (dir) => {
    const ed = editor.value
    if (ed) applyImagePatch(ed, dir)
  },
)

function applyImagePatch(ed: Editor, dir: string | null) {
  if (!ed.view?.dom) return
  patchImageSources(ed.view.dom as HTMLElement, dir)
}

defineExpose({ isReady, stats })
</script>

<template>
  <div ref="rootEl" class="editor-root">
    <EditorContent :editor="editor" class="editor-content" data-testid="prose-editor" />
  </div>
</template>

<style scoped>
.editor-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.editor-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 32px 40px 80px;
}

.editor-content :deep(.ProseMirror) {
  max-width: 720px;
  margin: 0 auto;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
  outline: none;
  min-height: 60vh;
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: var(--text-faint);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.editor-content :deep(h1) {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 600;
  margin: 1.6em 0 0.6em;
  letter-spacing: -0.01em;
}

.editor-content :deep(h2) {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
  margin: 1.4em 0 0.5em;
}

.editor-content :deep(h3) {
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 600;
  margin: 1.2em 0 0.4em;
}

.editor-content :deep(p) {
  margin: 0.6em 0;
}

.editor-content :deep(ul),
.editor-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.6em 0;
}

.editor-content :deep(ul[data-type='taskList']) {
  list-style: none;
  padding-left: 0;
}

.editor-content :deep(ul[data-type='taskList'] li) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.editor-content :deep(ul[data-type='taskList'] li > label) {
  flex: 0 0 auto;
  margin-top: 4px;
}

.editor-content :deep(ul[data-type='taskList'] li > div) {
  flex: 1;
}

.editor-content :deep(blockquote) {
  border-left: 2px solid var(--border-strong);
  margin: 0.8em 0;
  padding: 4px 14px;
  color: var(--text-muted);
}

.editor-content :deep(pre) {
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  font-family: var(--font-mono);
  font-size: 13px;
  overflow-x: auto;
  margin: 0.8em 0;
}

.editor-content :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--panel-2);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 4px;
}

.editor-content :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
}

.editor-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.6em 0;
}

.editor-content :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.editor-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  margin: 0.8em 0;
}

.editor-content :deep(.is-empty::before) {
  color: var(--text-faint);
}
</style>
