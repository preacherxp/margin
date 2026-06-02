<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { usePostsStore } from '@/stores/posts'
import type { Theme } from '@/types/settings'

defineOptions({ name: 'SettingsView' })

const settings = useSettingsStore()
const posts = usePostsStore()

const isPicking = ref(false)
const localTheme = ref<Theme>('dark')
const saveMessage = ref<string | null>(null)
let saveMessageTimer: ReturnType<typeof setTimeout> | null = null

const hasFolder = computed(() => !!settings.postsFolder)
const folderLabel = computed(() => settings.postsFolder ?? 'No folder selected')
const resolved = computed<Theme>(() => settings.theme)

const themeOptions: { value: Theme; label: string; hint: string }[] = [
  { value: 'dark', label: 'Dark', hint: 'Warm-tinted dark surfaces' },
  { value: 'light', label: 'Light', hint: 'Cream backgrounds' },
  { value: 'system', label: 'System', hint: 'Follow OS appearance' },
]

onMounted(() => {
  if (!settings.initialized) void settings.init()
  localTheme.value = settings.theme
})

watch(
  () => settings.theme,
  (next) => {
    if (next !== localTheme.value) localTheme.value = next
  },
)

function flash(msg: string) {
  saveMessage.value = msg
  if (saveMessageTimer) clearTimeout(saveMessageTimer)
  saveMessageTimer = setTimeout(() => {
    saveMessage.value = null
  }, 2200)
}

async function onChooseFolder() {
  isPicking.value = true
  try {
    const next = await settings.chooseFolder()
    if (next) {
      flash('Folder saved')
      await posts.refresh()
    }
  } finally {
    isPicking.value = false
  }
}

async function onClearFolder() {
  await settings.clearFolder()
  flash('Folder cleared')
}

async function onSelectTheme(theme: Theme) {
  if (localTheme.value === theme) return
  localTheme.value = theme
  await settings.setTheme(theme)
  flash(`Theme: ${theme}`)
}
</script>

<template>
  <section class="settings" data-testid="settings-view">
    <header class="settings-header">
      <h1 class="settings-title">Settings</h1>
      <p class="muted settings-sub">Storage location and appearance.</p>
    </header>

    <div class="card" data-testid="settings-folder-card">
      <div class="card-row">
        <div class="card-text">
          <h2 class="card-title">Posts folder</h2>
          <p class="card-desc">
            Posts are saved as <code>.md</code> files with YAML frontmatter in the
            folder you choose. You can keep them in iCloud, Dropbox, or anywhere
            on disk.
          </p>
          <p class="folder-value" data-testid="settings-folder-value">
            <span class="folder-label">Folder</span>
            <span class="folder-path" :title="folderLabel">{{ folderLabel }}</span>
          </p>
        </div>
        <div class="card-actions">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="isPicking"
            data-testid="settings-choose-folder-btn"
            @click="onChooseFolder"
          >
            {{ isPicking ? 'Picking…' : hasFolder ? 'Change Folder' : 'Choose Folder' }}
          </button>
          <button
            v-if="hasFolder"
            class="btn btn-ghost"
            type="button"
            data-testid="settings-clear-folder-btn"
            @click="onClearFolder"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <div class="card" data-testid="settings-theme-card">
      <div class="card-row">
        <div class="card-text">
          <h2 class="card-title">Theme</h2>
          <p class="card-desc">
            Dark is the default. Light flips to warm cream surfaces. System
            follows your OS appearance and updates live.
          </p>
        </div>
        <div class="theme-options" role="radiogroup" aria-label="Theme">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            type="button"
            role="radio"
            :aria-checked="localTheme === opt.value"
            :class="['theme-option', { active: localTheme === opt.value }]"
            :data-testid="`settings-theme-${opt.value}`"
            :data-selected="localTheme === opt.value"
            :title="opt.hint"
            @click="onSelectTheme(opt.value)"
          >
            <span class="theme-option-label">{{ opt.label }}</span>
            <span class="theme-option-hint">{{ opt.hint }}</span>
          </button>
        </div>
      </div>
      <p class="resolved-line" data-testid="settings-resolved-theme">
        <span class="muted">Applied:</span>
        <span class="resolved-value">{{ resolved }}</span>
      </p>
    </div>

    <Transition name="fade">
      <p
        v-if="saveMessage"
        class="save-toast"
        role="status"
        data-testid="settings-save-toast"
      >
        {{ saveMessage }}
      </p>
    </Transition>
  </section>
</template>

<style scoped>
.settings {
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  height: 100%;
}

.settings-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.settings-title {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.settings-sub {
  font-size: 13px;
  margin: 0;
}

.card {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
}

.card-text {
  flex: 1;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-title {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.card-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.card-desc code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--panel-2);
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.folder-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 4px 0 0;
  font-size: 12px;
  flex-wrap: wrap;
}

.folder-label {
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  font-size: 10px;
}

.folder-path {
  font-family: var(--font-mono);
  color: var(--text);
  background: var(--panel-2);
  border: 1px solid var(--border);
  padding: 2px 8px;
  border-radius: var(--radius);
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
  border-radius: var(--radius);
  text-align: left;
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    border-color var(--dur) var(--ease),
    color var(--dur) var(--ease);
}

.theme-option:hover {
  background: var(--panel);
  border-color: var(--border-strong);
}

.theme-option.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.theme-option-label {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: lowercase;
}

.theme-option-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.theme-option.active .theme-option-hint {
  color: var(--accent);
  opacity: 0.85;
}

.resolved-line {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.resolved-value {
  text-transform: lowercase;
  color: var(--text);
  background: var(--panel-2);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: var(--radius);
}

.save-toast {
  align-self: flex-start;
  margin: 0;
  padding: 6px 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--success);
  background: var(--panel-2);
  border: 1px solid var(--success-soft);
  border-radius: var(--radius);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--dur) var(--ease);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
