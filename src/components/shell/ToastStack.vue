<script setup lang="ts">
import { useToastsStore } from '@/stores/toasts'

const toasts = useToastsStore()
</script>

<template>
  <Teleport to="body">
    <div class="toaster" data-testid="toaster" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast" tag="div" class="stack">
        <div
          v-for="t in toasts.toasts"
          :key="t.id"
          class="toast"
          :data-kind="t.kind"
          :data-testid="`toast-${t.kind}`"
          role="status"
        >
          <span class="dot" :data-kind="t.kind" aria-hidden="true" />
          <span class="msg">{{ t.message }}</span>
          <button
            type="button"
            class="dismiss"
            aria-label="Dismiss"
            :data-testid="`toast-${t.kind}-dismiss`"
            @click="toasts.dismiss(t.id)"
          >
            ×
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toaster {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 80;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: min(420px, calc(100vw - 32px));
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.toast {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 240px;
  max-width: 100%;
  padding: 8px 10px 8px 12px;
  background: var(--panel);
  border: 1px solid var(--border-strong);
  border-left: 3px solid var(--border-strong);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.toast[data-kind='success'] {
  border-left-color: var(--success);
}

.toast[data-kind='warn'] {
  border-left-color: var(--warning);
}

.toast[data-kind='error'] {
  border-left-color: var(--danger);
}

.toast[data-kind='info'] {
  border-left-color: var(--accent);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-faint);
  flex-shrink: 0;
}

.dot[data-kind='success'] {
  background: var(--success);
}

.dot[data-kind='warn'] {
  background: var(--warning);
}

.dot[data-kind='error'] {
  background: var(--danger);
}

.dot[data-kind='info'] {
  background: var(--accent);
}

.msg {
  flex: 1;
  min-width: 0;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.dismiss {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.dismiss:hover {
  color: var(--text);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    transform var(--dur) var(--ease),
    opacity var(--dur) var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
