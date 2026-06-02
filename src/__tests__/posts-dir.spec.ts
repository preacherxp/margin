import { describe, expect, it } from 'vitest'
import { resolvePostsDir } from '@/lib/posts-dir'

describe('resolvePostsDir', () => {
  it('uses the selected folder when it is already the posts directory', () => {
    expect(resolvePostsDir('/Users/prchr/Documents/margin/posts')).toBe(
      '/Users/prchr/Documents/margin/posts',
    )
  })

  it('appends posts when the selected folder is a workspace root', () => {
    expect(resolvePostsDir('/Users/prchr/Documents/margin')).toBe(
      '/Users/prchr/Documents/margin/posts',
    )
  })

  it('normalizes trailing slashes', () => {
    expect(resolvePostsDir('/mock/posts/')).toBe('/mock/posts')
  })
})
