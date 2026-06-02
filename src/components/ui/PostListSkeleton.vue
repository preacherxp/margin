<script setup lang="ts">
import SkeletonBar from '@/components/ui/SkeletonBar.vue'

withDefaults(
  defineProps<{
    count?: number
  }>(),
  { count: 5 },
)
</script>

<template>
  <ul class="list" data-testid="post-list-skeleton" aria-busy="true" aria-label="Loading posts">
    <li v-for="i in count" :key="i" class="row">
      <div class="row-top">
        <SkeletonBar width="60%" height="14px" />
        <SkeletonBar width="56px" height="10px" />
      </div>
      <div class="row-meta">
        <SkeletonBar width="48px" height="10px" />
        <SkeletonBar width="36px" height="10px" />
        <SkeletonBar width="80px" height="10px" />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row {
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--panel);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
