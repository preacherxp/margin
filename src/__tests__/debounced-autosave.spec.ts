import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useDebouncedAutoSave } from '@/lib/tiptap/useDebouncedAutoSave'

function harness(save: (v: string) => Promise<void> | void, delay = 50) {
  return defineComponent({
    setup() {
      const source = ref('a')
      const api = useDebouncedAutoSave<string>({
        source,
        save,
        delay,
      })
      return { source, ...api }
    },
    render() {
      return h('div')
    },
  })
}

describe('useDebouncedAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces and calls save with the latest value', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const wrapper = mount(harness(save))
    wrapper.vm.source = 'a'
    wrapper.vm.source = 'b'
    wrapper.vm.source = 'c'
    await nextTick()
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('c')
    wrapper.unmount()
  })

  it('reports pending then saved status', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const wrapper = mount(harness(save))
    wrapper.vm.source = 'x'
    await nextTick()
    expect(wrapper.vm.status).toBe('pending')
    await vi.advanceTimersByTimeAsync(60)
    await nextTick()
    expect(wrapper.vm.status).toBe('saved')
    wrapper.unmount()
  })

  it('skips save when value is unchanged from last saved', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const wrapper = mount(harness(save))
    wrapper.vm.source = 'x'
    await vi.advanceTimersByTimeAsync(60)
    expect(save).toHaveBeenCalledTimes(1)
    wrapper.vm.source = 'x'
    await vi.advanceTimersByTimeAsync(60)
    expect(save).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('flushes on unmount', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const wrapper = mount(harness(save))
    wrapper.vm.source = 'late'
    await nextTick()
    wrapper.unmount()
    await nextTick()
    expect(save).toHaveBeenCalledWith('late')
  })

  it('reports error status when save rejects', async () => {
    const save = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('boom'))
    const wrapper = mount(harness(save))
    wrapper.vm.source = 'oops'
    await vi.advanceTimersByTimeAsync(60)
    await nextTick()
    expect(wrapper.vm.status).toBe('error')
    expect(wrapper.vm.lastError?.message).toBe('boom')
    wrapper.unmount()
  })
})
