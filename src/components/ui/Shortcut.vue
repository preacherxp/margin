<script setup lang="ts">
import { computed } from 'vue'
import { renderShortcut } from '@/lib/shortcuts'

const props = withDefaults(
  defineProps<{
    keys: string
    treatment?: 'inline' | 'keycap'
  }>(),
  {
    treatment: 'inline',
  },
)

const rendered = computed(() => renderShortcut(props.keys))
</script>

<template>
  <kbd v-if="treatment === 'keycap'" class="key">{{ rendered }}</kbd>
  <span v-else class="shortcut">{{ rendered }}</span>
</template>
