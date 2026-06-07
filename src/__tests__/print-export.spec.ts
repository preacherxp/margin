import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('@/lib/tauri-bridge', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tauri-bridge')>('@/lib/tauri-bridge')
  return {
    ...actual,
    printActiveWindow: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  }
})

import PrintExport from '@/components/editor/PrintExport.vue'
import { printActiveWindow } from '@/lib/tauri-bridge'

const mockedPrint = vi.mocked(printActiveWindow)

describe('PrintExport', () => {
  beforeEach(() => {
    mockedPrint.mockReset()
    mockedPrint.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the PDF button with the print testid', () => {
    const wrapper = mount(PrintExport)
    const btn = wrapper.get('[data-testid="print-export-btn"]')
    expect(btn.text()).toContain('PDF')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('does not show a status line in the idle state', () => {
    const wrapper = mount(PrintExport)
    expect(wrapper.find('[data-testid="print-export-status"]').exists()).toBe(false)
  })

  it('invokes the print bridge when the button is clicked', async () => {
    const wrapper = mount(PrintExport)
    await wrapper.get('[data-testid="print-export-btn"]').trigger('click')
    await flushPromises()
    expect(mockedPrint).toHaveBeenCalledTimes(1)
  })

  it('shows an opening then opened status after a successful print', async () => {
    const wrapper = mount(PrintExport)
    await wrapper.get('[data-testid="print-export-btn"]').trigger('click')

    // opening should be visible immediately (synchronous, before promise resolves)
    await nextTick()
    expect(wrapper.find('[data-testid="print-export-status"]').exists()).toBe(true)
    const status = wrapper.get('[data-testid="print-export-status"]')
    expect(status.attributes('data-state')).toMatch(/opening|opened/)
    expect(status.text()).toMatch(/Opening print panel|Print dialog opened/)

    // let the promise resolve and the next microtask flush
    await flushPromises()
    expect(wrapper.get('[data-testid="print-export-status"]').attributes('data-state')).toBe(
      'opened',
    )
    expect(wrapper.get('[data-testid="print-export-status"]').text()).toContain(
      'Print dialog opened',
    )
    expect(wrapper.get('[data-testid="print-export-status"]').text()).toContain('Save as PDF')
  })

  it('re-enables the button and clears the status after a successful print', async () => {
    vi.useFakeTimers()
    const wrapper = mount(PrintExport)
    await wrapper.get('[data-testid="print-export-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="print-export-btn"]').attributes('data-state')).toBe('opened')
    vi.advanceTimersByTime(4500)
    await flushPromises()
    expect(wrapper.find('[data-testid="print-export-status"]').exists()).toBe(false)
    expect(
      (wrapper.get('[data-testid="print-export-btn"]').element as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('shows an error state when the bridge rejects', async () => {
    mockedPrint.mockRejectedValueOnce(new Error('native print failed'))
    const wrapper = mount(PrintExport)
    await wrapper.get('[data-testid="print-export-btn"]').trigger('click')
    await flushPromises()
    const status = wrapper.get('[data-testid="print-export-status"]')
    expect(status.attributes('data-state')).toBe('error')
    expect(status.text()).toContain('Print failed')
    expect(status.text()).toContain('native print failed')
  })

  it('disables the button while the print call is in flight', async () => {
    const pending: { resolve?: (v: void) => void } = {}
    mockedPrint.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          pending.resolve = resolve
        }),
    )
    const wrapper = mount(PrintExport)
    await wrapper.get('[data-testid="print-export-btn"]').trigger('click')
    await nextTick()
    const btn = wrapper.get('[data-testid="print-export-btn"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    expect(btn.attributes('data-state')).toBe('opening')

    // resolve the pending print
    pending.resolve?.()
    await flushPromises()
    expect(
      (wrapper.get('[data-testid="print-export-btn"]').element as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('does not invoke the print bridge when disabled', async () => {
    const wrapper = mount(PrintExport, { props: { disabled: true } })
    const btn = wrapper.get('[data-testid="print-export-btn"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    await btn.trigger('click')
    expect(mockedPrint).not.toHaveBeenCalled()
  })

  it('emits a print event when the button is clicked', async () => {
    const wrapper = mount(PrintExport)
    await wrapper.get('[data-testid="print-export-btn"]').trigger('click')
    await flushPromises()
    const events = wrapper.emitted('print')
    expect(events).toBeTruthy()
    expect(events?.length).toBe(1)
  })
})
