<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { isTauri } from '@/lib/tauri-bridge'

const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()

const env = computed(() => (isTauri() ? 'tauri' : 'browser (mock data)'))
const folder = computed(() => settings.postsFolder ?? 'No folder selected')

const navItems = computed(() => [
  { name: 'home' as const, label: 'Posts' },
  { name: 'templates' as const, label: 'Templates' },
  { name: 'settings' as const, label: 'Settings' },
])

function onNav(name: 'home' | 'templates' | 'settings') {
  void router.push({ name })
}
</script>

<template>
  <header class="top-bar" data-testid="top-bar">
    <div class="brand" data-testid="brand">
      <span class="brand-mark" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
        >
          <rect
            x="2.75"
            y="2.75"
            width="18.5"
            height="18.5"
            rx="4"
            fill="var(--panel-2)"
            stroke="var(--brand)"
            stroke-width="1.5"
          />
          <rect x="7" y="5.75" width="3" height="12.5" rx="0.75" fill="var(--accent)" />
          <rect x="11.5" y="5.75" width="3" height="12.5" rx="0.75" fill="var(--accent-hover)" />
          <circle cx="17" cy="12" r="1.5" fill="var(--success)" />
        </svg>
      </span>
      <span class="brand-name">Margin</span>
    </div>
    <nav class="nav" aria-label="Primary">
      <button
        v-for="item in navItems"
        :key="item.name"
        type="button"
        class="nav-link"
        :class="{ active: route.name === item.name }"
        :data-testid="`nav-${item.name}`"
        @click="onNav(item.name)"
      >
        {{ item.label }}
      </button>
    </nav>
    <div class="env" :title="folder">
      <span class="env-label">env</span>
      <span class="env-value" data-testid="env-value">{{ env }}</span>
      <span class="env-folder" data-testid="env-folder">{{ folder }}</span>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
  font-family: var(--font-mono);
  font-size: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--gap-2);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--accent);
}

.brand-name {
  color: var(--text);
  letter-spacing: 0.02em;
}

.env {
  display: flex;
  align-items: center;
  gap: var(--gap-2);
  color: var(--text-muted);
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  margin-right: 16px;
}

.nav-link {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: lowercase;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}

.nav-link:hover {
  color: var(--text);
  background: var(--panel-2);
}

.nav-link.active {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent-soft);
}

.env-label {
  color: var(--text-faint);
}

.env-value {
  color: var(--text);
  padding: 2px 6px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
}

.env-folder {
  color: var(--text-faint);
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
