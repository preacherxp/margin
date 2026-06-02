import { describe, it, expect } from 'vitest'
import { resolveImageSrc } from '@/lib/tiptap/imageSource'

describe('resolveImageSrc', () => {
  it('passes through http urls', () => {
    expect(resolveImageSrc('https://x.com/a.png', { postsDir: '/p/posts' })).toBe(
      'https://x.com/a.png',
    )
  })

  it('passes through data urls', () => {
    expect(resolveImageSrc('data:image/png;base64,abc', { postsDir: '/p/posts' })).toBe(
      'data:image/png;base64,abc',
    )
  })

  it('passes through tauri asset urls', () => {
    expect(resolveImageSrc('tauri://localhost/a.png', { postsDir: '/p/posts' })).toBe(
      'tauri://localhost/a.png',
    )
  })

  it('resolves bare assets/ relative to postsDir', () => {
    expect(resolveImageSrc('assets/foo.png', { postsDir: '/p/posts' })).toBe(
      '/p/posts/assets/foo.png',
    )
  })

  it('resolves ./assets/ relative to postsDir', () => {
    expect(resolveImageSrc('./assets/foo.png', { postsDir: '/p/posts' })).toBe(
      '/p/posts/assets/foo.png',
    )
  })

  it('returns the raw src if postsDir is missing', () => {
    expect(resolveImageSrc('assets/foo.png', { postsDir: null })).toBe('assets/foo.png')
  })

  it('handles trailing slash in postsDir', () => {
    expect(resolveImageSrc('assets/foo.png', { postsDir: '/p/posts/' })).toBe(
      '/p/posts/assets/foo.png',
    )
  })
})
