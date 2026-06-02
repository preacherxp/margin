import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { PostStatus } from '@/types/post'

export type StatusFilter = 'all' | PostStatus
export type SortKey = 'updated' | 'created' | 'scheduled'

export const useUiStore = defineStore('ui', () => {
  const paletteOpen = ref(false)
  const shortcutsOpen = ref(false)
  const statusFilter = ref<StatusFilter>('all')
  const tagFilters = ref<string[]>([])
  const sortKey = ref<SortKey>('updated')
  const searchQuery = ref('')
  const previewId = ref<string | null>(null)

  const hasActiveFilters = computed(
    () => statusFilter.value !== 'all' || tagFilters.value.length > 0 || !!searchQuery.value.trim(),
  )

  function openPalette() {
    paletteOpen.value = true
  }

  function closePalette() {
    paletteOpen.value = false
  }

  function togglePalette() {
    paletteOpen.value = !paletteOpen.value
  }

  function openShortcuts() {
    shortcutsOpen.value = true
  }

  function closeShortcuts() {
    shortcutsOpen.value = false
  }

  function toggleShortcuts() {
    shortcutsOpen.value = !shortcutsOpen.value
  }

  function setStatus(next: StatusFilter) {
    statusFilter.value = next
  }

  function toggleTag(tag: string) {
    const idx = tagFilters.value.indexOf(tag)
    if (idx >= 0) {
      tagFilters.value = tagFilters.value.filter((t) => t !== tag)
      return
    }
    tagFilters.value = [...tagFilters.value, tag]
  }

  function clearTags() {
    tagFilters.value = []
  }

  function setSort(next: SortKey) {
    sortKey.value = next
  }

  function setSearch(q: string) {
    searchQuery.value = q
  }

  function setPreview(id: string | null) {
    previewId.value = id
  }

  function clearFilters() {
    statusFilter.value = 'all'
    tagFilters.value = []
    searchQuery.value = ''
  }

  return {
    paletteOpen,
    shortcutsOpen,
    statusFilter,
    tagFilters,
    sortKey,
    searchQuery,
    previewId,
    hasActiveFilters,
    openPalette,
    closePalette,
    togglePalette,
    openShortcuts,
    closeShortcuts,
    toggleShortcuts,
    setStatus,
    toggleTag,
    clearTags,
    setSort,
    setSearch,
    setPreview,
    clearFilters,
  }
})
