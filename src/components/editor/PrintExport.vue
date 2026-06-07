<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { printActiveWindow } from '@/lib/tauri-bridge'
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'print'): void
}>()

type PrintState = 'idle' | 'opening' | 'opened' | 'error'

const state = ref<PrintState>('idle')
const message = ref<string>('')
let resetTimer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
}

function setState(next: PrintState, text: string, autoResetMs?: number) {
  clearTimer()
  state.value = next
  message.value = text
  if (autoResetMs) {
    resetTimer = setTimeout(() => {
      state.value = 'idle'
      message.value = ''
    }, autoResetMs)
  }
}

async function triggerPrint() {
  emit('print')
  setState('opening', 'Opening print panel…')
  try {
    await printActiveWindow()
    setState('opened', 'Print dialog opened — pick Save as PDF', 4000)
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    setState('error', `Print failed: ${errMsg}`, 6000)
  }
}

onBeforeUnmount(() => {
  clearTimer()
})
</script>

<template>
  <span class="print-wrap" data-testid="print-export">
    <button
      type="button"
      class="btn btn-ghost print-btn"
      data-testid="print-export-btn"
      :disabled="disabled || state === 'opening'"
      :data-state="state"
      title="Print or Save as PDF"
      @click="triggerPrint"
    >
      <AppIcon name="printer" />
      PDF
    </button>
    <span
      v-if="state !== 'idle'"
      class="print-status"
      :data-state="state"
      data-testid="print-export-status"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </span>
  </span>
</template>

<style scoped>
.print-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.print-btn {
  font-size: 12px;
}

.print-btn[data-state='opening'] {
  color: var(--accent);
  border-color: var(--accent-soft);
}

.print-btn[data-state='opened'] {
  color: var(--success);
  border-color: var(--success-soft);
}

.print-btn[data-state='error'] {
  color: var(--danger);
  border-color: var(--danger-soft);
}

.print-status {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.print-status[data-state='opening'] {
  color: var(--accent);
}

.print-status[data-state='opened'] {
  color: var(--success);
}

.print-status[data-state='error'] {
  color: var(--danger);
}
</style>
