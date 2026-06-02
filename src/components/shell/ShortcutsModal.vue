<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { SHORTCUT, SHORTCUTS } from '@/lib/useGlobalShortcuts'
import Shortcut from '@/components/ui/Shortcut.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const ui = useUiStore()

const grouped = computed(() => {
  const order: Array<{ scope: 'global' | 'home' | 'editor'; title: string }> = [
    { scope: 'global', title: 'Global' },
    { scope: 'home', title: 'Posts' },
    { scope: 'editor', title: 'Editor' },
  ]
  return order
    .map((g) => ({
      title: g.title,
      items: SHORTCUTS.filter((s) => s.scope === g.scope),
    }))
    .filter((g) => g.items.length > 0)
})

function onBackdrop() {
  ui.closeShortcuts()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && ui.shortcutsOpen) {
    e.stopPropagation()
    ui.closeShortcuts()
  }
}

watch(
  () => ui.shortcutsOpen,
  (open) => {
    if (open) {
      document.addEventListener('keydown', onKey)
    } else {
      document.removeEventListener('keydown', onKey)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.shortcutsOpen"
      class="backdrop"
      data-testid="shortcuts-modal"
      role="dialog"
      aria-label="Keyboard shortcuts"
      @click="onBackdrop"
    >
      <div class="modal" @click.stop>
        <header class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            type="button"
            class="btn btn-ghost btn-icon close"
            aria-label="Close shortcuts"
            title="Close"
            data-testid="shortcuts-modal-close"
            @click="ui.closeShortcuts"
          >
            <AppIcon name="x" />
          </button>
        </header>
        <div class="modal-body">
          <section v-for="group in grouped" :key="group.title" class="group">
            <h3 class="group-title">{{ group.title }}</h3>
            <ul class="list">
              <li
                v-for="s in group.items"
                :key="s.combo"
                class="row"
                :data-testid="`shortcut-${s.combo.replace(/[^a-z0-9]+/gi, '-')}`"
              >
                <span class="desc">{{ s.description }}</span>
                <span class="keys">
                  <Shortcut :keys="s.combo" treatment="keycap" />
                </span>
              </li>
            </ul>
          </section>
        </div>
        <footer class="modal-footer">
          <span class="muted small">
            Press <Shortcut :keys="SHORTCUT.shortcuts" treatment="keycap" /> to toggle this dialog.
          </span>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70;
  padding: 16px;
}

.modal {
  width: min(520px, 100%);
  max-height: 80vh;
  background: var(--panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-title {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  font-weight: 500;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 8px;
  border-radius: var(--radius);
  font-size: 12px;
}

.row:hover {
  background: var(--panel-2);
}

.desc {
  color: var(--text);
}

.keys {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--panel-2);
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
  border-bottom-width: 2px;
  border-radius: 4px;
}

.modal-footer {
  padding: 10px 18px;
  border-top: 1px solid var(--border);
  background: var(--panel-2);
}

.muted {
  color: var(--text-muted);
}

.small {
  font-size: 11px;
}
</style>
