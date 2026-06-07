<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Post } from '@/types/post'
import { buildLinkedinOutput, LINKEDIN_CHAR_LIMIT } from '@/lib/linkedin'
import { useToasts } from '@/lib/useToasts'
import AppIcon from '@/components/ui/AppIcon.vue'

const toasts = useToasts()

const props = defineProps<{
  post: Post
}>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const copyState = ref<'idle' | 'copied' | 'error'>('idle')
let copyTimer: ReturnType<typeof setTimeout> | null = null

const output = computed(() => buildLinkedinOutput(props.post))

const fillPct = computed(() => Math.min(100, (output.value.chars / LINKEDIN_CHAR_LIMIT) * 100))

const fillTone = computed(() => {
  if (output.value.overLimit) return 'over'
  if (fillPct.value >= 90) return 'warn'
  if (fillPct.value >= 70) return 'close'
  return 'ok'
})

function toggle() {
  open.value = !open.value
  if (open.value) {
    copyState.value = 'idle'
    void nextTick(() => textareaEl.value?.focus())
  }
}

function close() {
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as Node | null
  if (target && rootEl.value && !rootEl.value.contains(target)) {
    close()
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    e.stopPropagation()
    close()
  }
}

watch(open, (v) => {
  if (v) {
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
  } else {
    document.removeEventListener('mousedown', onDocClick)
    document.removeEventListener('keydown', onKey)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
  if (copyTimer) clearTimeout(copyTimer)
})

async function copy() {
  if (!output.value.text) return
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(output.value.text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = output.value.text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (!ok) throw new Error('execCommand copy failed')
    }
    copyState.value = 'copied'
    toasts.success('Copied to clipboard')
  } catch {
    copyState.value = 'error'
    toasts.error('Copy to clipboard failed')
  }
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copyState.value = 'idle'
  }, 1800)
}

function selectAll() {
  textareaEl.value?.select()
}
</script>

<template>
  <div ref="rootEl" class="export-wrap" data-testid="linkedin-export">
    <button
      class="btn btn-ghost"
      type="button"
      :aria-expanded="open"
      data-testid="linkedin-export-btn"
      @click="toggle"
    >
      <span>LinkedIn</span>
      <span
        v-if="output.chars > 0"
        class="count-pill"
        :data-tone="fillTone"
        data-testid="linkedin-char-count"
      >
        {{ output.chars }} / {{ LINKEDIN_CHAR_LIMIT }}
      </span>
    </button>

    <div v-if="open" class="popover" data-testid="linkedin-export-popover" role="dialog">
      <header class="popover-header">
        <div class="title-row">
          <h3>LinkedIn Preview</h3>
          <button
            class="btn btn-ghost btn-icon close"
            type="button"
            aria-label="Close Preview"
            title="Close Preview"
            data-testid="linkedin-export-close"
            @click="close"
          >
            <AppIcon name="x" />
          </button>
        </div>
        <div class="meta-row">
          <div class="bar" :data-tone="fillTone" data-testid="linkedin-export-bar">
            <div class="bar-fill" :style="{ width: fillPct + '%' }" />
          </div>
          <span class="count" :data-tone="fillTone" data-testid="linkedin-export-count">
            {{ output.chars }} chars · {{ output.words }} words
          </span>
          <span v-if="output.overLimit" class="warn-text" data-testid="linkedin-export-overlimit">
            Over LinkedIn limit ({{ LINKEDIN_CHAR_LIMIT }}).
          </span>
        </div>
      </header>

      <textarea
        ref="textareaEl"
        class="preview"
        readonly
        rows="14"
        :value="output.text"
        placeholder="Hook, body, CTA, and hashtags will appear here when you start writing."
        data-testid="linkedin-export-text"
        @focus="selectAll"
      />

      <footer class="popover-footer">
        <button
          class="btn"
          type="button"
          data-testid="linkedin-export-select-btn"
          @click="selectAll"
        >
          Select All
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="output.chars === 0"
          :data-state="copyState"
          data-testid="linkedin-export-copy-btn"
          @click="copy"
        >
          <span v-if="copyState === 'copied'">Copied</span>
          <span v-else-if="copyState === 'error'">Copy Failed</span>
          <span v-else>Copy to Clipboard</span>
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.export-wrap {
  position: relative;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.count-pill {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 1px 6px;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  color: var(--text-faint);
}

.count-pill[data-tone='ok'] {
  color: var(--text-muted);
  border-color: var(--border);
}

.count-pill[data-tone='close'] {
  color: var(--text);
  border-color: var(--border-strong);
}

.count-pill[data-tone='warn'] {
  color: var(--warning);
  border-color: var(--warning-soft);
}

.count-pill[data-tone='over'] {
  color: var(--danger);
  border-color: var(--danger-soft);
}

.popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: min(520px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 50;
  overflow: hidden;
}

.popover-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-row h3 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 600;
}

.close {
  color: var(--text-faint);
}

.close:hover {
  color: var(--text);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bar {
  flex: 1;
  height: 4px;
  background: var(--panel-2);
  border-radius: 2px;
  overflow: hidden;
  min-width: 80px;
}

.bar-fill {
  height: 100%;
  background: var(--text-faint);
  transition:
    width 150ms var(--ease),
    background 150ms var(--ease);
}

.bar[data-tone='close'] .bar-fill {
  background: var(--text-muted);
}

.bar[data-tone='warn'] .bar-fill {
  background: var(--warning);
}

.bar[data-tone='over'] .bar-fill {
  background: var(--danger);
}

.count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
  white-space: nowrap;
}

.count[data-tone='warn'] {
  color: var(--warning);
}

.count[data-tone='over'] {
  color: var(--danger);
}

.warn-text {
  font-size: 11px;
  color: var(--danger);
  font-family: var(--font-mono);
}

.preview {
  flex: 1;
  min-height: 200px;
  width: 100%;
  padding: 12px 14px;
  background: var(--bg);
  border: none;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: var(--font-sans);
}

.popover-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: var(--panel);
}

.btn-primary[data-state='copied'] {
  background: var(--success);
  border-color: var(--success);
}

.btn-primary[data-state='error'] {
  background: var(--danger);
  border-color: var(--danger);
}
</style>
