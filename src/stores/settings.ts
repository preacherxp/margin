import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_SETTINGS, type AppSettings, type Theme } from '@/types/settings'
import { loadSettings, pickFolder, saveSettings } from '@/lib/tauri-bridge'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const postsFolder = computed(() => settings.value.postsFolder)
  const theme = computed<Theme>(() => settings.value.theme)

  async function init() {
    if (initialized.value) return
    loading.value = true
    error.value = null
    try {
      settings.value = await loadSettings()
      initialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function chooseFolder(): Promise<string | null> {
    error.value = null
    try {
      const folder = await pickFolder()
      if (folder) {
        settings.value = { ...settings.value, postsFolder: folder }
        await saveSettings(settings.value)
      }
      return folder
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    }
  }

  async function clearFolder() {
    settings.value = { ...settings.value, postsFolder: null }
    await saveSettings(settings.value)
  }

  async function setTheme(next: Theme) {
    settings.value = { ...settings.value, theme: next }
    await saveSettings(settings.value)
  }

  return {
    settings,
    loading,
    error,
    initialized,
    postsFolder,
    theme,
    init,
    chooseFolder,
    clearFolder,
    setTheme,
  }
})
