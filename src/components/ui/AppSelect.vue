<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    ariaLabel?: string
    id?: string
    disabled?: boolean
    compact?: boolean
  }>(),
  {
    ariaLabel: undefined,
    id: undefined,
    disabled: false,
    compact: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const activeIndex = ref(0)
const rootEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)

const selectedIndex = computed(() =>
  Math.max(
    0,
    props.options.findIndex((option) => option.value === props.modelValue),
  ),
)

const selected = computed(() => props.options[selectedIndex.value] ?? props.options[0])
const listboxId = computed(() => `${props.id ?? 'select'}-listbox`)

watch(open, async (isOpen) => {
  if (isOpen) {
    activeIndex.value = selectedIndex.value
    document.addEventListener('mousedown', onDocClick)
    await nextTick()
    return
  }
  document.removeEventListener('mousedown', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
})

function onDocClick(e: MouseEvent) {
  const target = e.target as Node | null
  if (target && rootEl.value?.contains(target)) return
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function closeAndFocus() {
  open.value = false
  void nextTick(() => triggerEl.value?.focus())
}

function choose(option: SelectOption) {
  emit('update:modelValue', option.value)
  closeAndFocus()
}

function move(delta: number) {
  if (props.options.length === 0) return
  activeIndex.value = (activeIndex.value + delta + props.options.length) % props.options.length
}

function onTriggerKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    open.value = true
    move(e.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle()
  }
}

function onListKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeAndFocus()
    return
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    move(e.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    const option = props.options[activeIndex.value]
    if (option) choose(option)
  }
}
</script>

<template>
  <div
    ref="rootEl"
    class="select"
    :class="{ compact }"
    data-ui="select"
    @keydown="open ? onListKey($event) : undefined"
  >
    <button
      :id="id"
      ref="triggerEl"
      type="button"
      class="select-trigger"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      :aria-controls="listboxId"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span class="select-label">{{ selected?.label }}</span>
      <svg
        aria-hidden="true"
        class="select-chevron"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </button>

    <Transition name="select-pop">
      <div
        v-if="open"
        :id="listboxId"
        class="select-menu"
        role="listbox"
        :aria-label="ariaLabel"
        tabindex="-1"
      >
        <button
          v-for="(option, index) in options"
          :key="option.value"
          type="button"
          class="select-option"
          :class="{ active: index === activeIndex, selected: option.value === modelValue }"
          role="option"
          :aria-selected="option.value === modelValue"
          @mouseenter="activeIndex = index"
          @click="choose(option)"
        >
          <span class="option-main">
            <span class="option-label">{{ option.label }}</span>
            <span v-if="option.hint" class="option-hint">{{ option.hint }}</span>
          </span>
          <span v-if="option.value === modelValue" class="option-check" aria-hidden="true">✓</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.select {
  position: relative;
  min-width: 0;
}

.select-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 29px;
  padding: 0 9px 0 11px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--text);
  font: 500 13px/1 var(--font-sans);
  white-space: nowrap;
  transition:
    background 120ms var(--ease),
    transform 40ms var(--ease);
}

.select-trigger:hover {
  background: var(--control-hover);
}

.select-trigger:active {
  background: var(--control-active);
  transform: scale(0.97);
}

.select-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3.5px var(--accent-ring);
}

.select-trigger:disabled {
  opacity: 0.4;
  pointer-events: none;
}

.select-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-chevron {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  color: var(--text-muted);
  stroke-width: 1.75;
}

.select-menu {
  position: absolute;
  z-index: 80;
  top: calc(100% + 5px);
  left: 0;
  min-width: max(100%, 160px);
  max-width: min(300px, 70vw);
  padding: 4px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.42);
}

.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 28px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: calc(var(--radius) - 1px);
  background: transparent;
  color: var(--text);
  text-align: left;
}

.select-option.active {
  background: var(--control-hover);
}

.select-option.selected {
  color: var(--accent);
}

.option-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.option-label {
  font-size: 13px;
  line-height: 1.15;
}

.option-hint {
  color: var(--text-faint);
  font-size: 11px;
  line-height: 1.2;
}

.option-check {
  color: var(--accent);
  font-size: 12px;
}

.compact .select-trigger {
  font-size: 12px;
}

.select-pop-enter-active,
.select-pop-leave-active {
  transition:
    opacity 100ms var(--ease),
    transform 100ms var(--ease);
}

.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .select-trigger,
  .select-pop-enter-active,
  .select-pop-leave-active {
    transition: none;
  }

  .select-trigger:active {
    transform: none;
  }
}
</style>
