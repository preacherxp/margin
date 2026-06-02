import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonBar from '@/components/ui/SkeletonBar.vue'
import PostListSkeleton from '@/components/ui/PostListSkeleton.vue'
import EditorSkeleton from '@/components/ui/EditorSkeleton.vue'
import ListSkeleton from '@/components/ui/ListSkeleton.vue'

describe('SkeletonBar', () => {
  it('renders a single bar with custom dimensions', () => {
    const wrapper = mount(SkeletonBar, { props: { width: '60%', height: '14px' } })
    const el = wrapper.find('.skeleton')
    expect(el.exists()).toBe(true)
    const style = el.attributes('style') ?? ''
    expect(style).toContain('width: 60%')
    expect(style).toContain('height: 14px')
  })

  it('hides itself from assistive tech (aria-hidden)', () => {
    const wrapper = mount(SkeletonBar)
    expect(wrapper.find('.skeleton').attributes('aria-hidden')).toBe('true')
  })

  it('applies block display when block is set', () => {
    const wrapper = mount(SkeletonBar, { props: { block: true } })
    expect(wrapper.find('.skeleton').classes()).toContain('block')
  })
})

describe('PostListSkeleton', () => {
  it('renders the requested number of rows', () => {
    const wrapper = mount(PostListSkeleton, { props: { count: 3 } })
    expect(wrapper.findAll('.row')).toHaveLength(3)
  })

  it('uses a default of 5 rows when no count is given', () => {
    const wrapper = mount(PostListSkeleton)
    expect(wrapper.findAll('.row')).toHaveLength(5)
  })

  it('marks itself aria-busy for accessibility', () => {
    const wrapper = mount(PostListSkeleton)
    expect(wrapper.find('[data-testid="post-list-skeleton"]').attributes('aria-busy')).toBe('true')
  })
})

describe('EditorSkeleton', () => {
  it('renders a placeholder title + body lines', () => {
    const wrapper = mount(EditorSkeleton)
    expect(wrapper.find('[data-testid="editor-skeleton"]').exists()).toBe(true)
    expect(wrapper.findAll('.skeleton').length).toBeGreaterThan(0)
  })
})

describe('ListSkeleton', () => {
  it('renders the requested row count with the requested number of lines', () => {
    const wrapper = mount(ListSkeleton, { props: { count: 4, lines: 2 } })
    const rows = wrapper.findAll('.skel-item')
    expect(rows).toHaveLength(4)
    for (const row of rows) {
      expect(row.findAll('.skeleton').length).toBe(2)
    }
  })

  it('renders a single-line row when lines=1', () => {
    const wrapper = mount(ListSkeleton, { props: { count: 2, lines: 1 } })
    for (const row of wrapper.findAll('.skel-item')) {
      expect(row.findAll('.skeleton').length).toBe(1)
    }
  })
})
