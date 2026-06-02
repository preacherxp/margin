<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    radius?: string
    block?: boolean
  }>(),
  {
    width: '100%',
    height: '12px',
    radius: '4px',
    block: false,
  },
)
</script>

<template>
  <span
    class="skeleton"
    :class="{ block }"
    :style="{ width, height, borderRadius: radius }"
    aria-hidden="true"
  />
</template>

<style scoped>
.skeleton {
  display: inline-block;
  background: linear-gradient(
    90deg,
    var(--panel-2) 0%,
    var(--border) 50%,
    var(--panel-2) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
  vertical-align: middle;
}

.skeleton.block {
  display: block;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
</style>
