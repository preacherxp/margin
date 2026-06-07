<script setup lang="ts">
import SkeletonBar from '@/components/ui/SkeletonBar.vue'
</script>

<template>
  <div
    class="editor-skeleton"
    data-testid="editor-skeleton"
    aria-busy="true"
    aria-label="Loading post"
  >
    <div class="title-row">
      <SkeletonBar width="36%" height="22px" />
      <SkeletonBar width="120px" height="22px" />
    </div>
    <div class="meta">
      <SkeletonBar width="80px" height="14px" />
      <SkeletonBar width="60px" height="14px" />
      <SkeletonBar width="100px" height="14px" />
    </div>
    <div class="lines">
      <SkeletonBar block width="100%" height="14px" />
      <SkeletonBar block width="92%" height="14px" />
      <SkeletonBar block width="78%" height="14px" />
      <SkeletonBar block width="100%" height="14px" />
      <SkeletonBar block width="60%" height="14px" />
    </div>
  </div>
</template>

<style scoped>
.editor-skeleton {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  padding: 32px 40px 80px;
  overflow: auto;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
