<script setup lang="ts">
import SkeletonBar from '@/components/ui/SkeletonBar.vue'

withDefaults(
  defineProps<{
    count?: number
    lines?: number
  }>(),
  { count: 4, lines: 2 },
)
</script>

<template>
  <ul class="skel-list" aria-busy="true" aria-label="Loading">
    <li v-for="i in count" :key="i" class="skel-item">
      <SkeletonBar v-if="lines >= 1" block :width="i % 2 === 0 ? '72%' : '60%'" height="13px" />
      <SkeletonBar v-if="lines >= 2" block :width="i % 2 === 0 ? '48%' : '90%'" height="10px" />
    </li>
  </ul>
</template>

<style scoped>
.skel-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skel-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--radius);
  background: var(--panel);
  border: 1px solid var(--border);
}
</style>
