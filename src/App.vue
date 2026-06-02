<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useGlobalShortcuts } from '@/lib/useGlobalShortcuts'
import { useErrorToasts } from '@/lib/useErrorToasts'
import { useTheme } from '@/lib/theme'
import { RouterView } from 'vue-router'
import TopBar from '@/components/shell/TopBar.vue'
import CommandPalette from '@/components/search/CommandPalette.vue'
import ShortcutsModal from '@/components/shell/ShortcutsModal.vue'
import Toaster from '@/components/shell/ToastStack.vue'

const settings = useSettingsStore()
useGlobalShortcuts()
useErrorToasts()
useTheme()

onMounted(() => {
  settings.init()
})
</script>

<template>
  <div class="app-shell" data-testid="app-shell">
    <TopBar />
    <main class="app-main">
      <RouterView />
    </main>
    <CommandPalette />
    <ShortcutsModal />
    <Toaster />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
