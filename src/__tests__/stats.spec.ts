import { describe, it, expect } from 'vitest'
import { computeStats } from '@/lib/tiptap/stats'

describe('computeStats', () => {
  it('counts empty markdown as zero', () => {
    const s = computeStats('')
    expect(s.words).toBe(0)
    expect(s.chars).toBe(0)
    expect(s.readMinutes).toBe(0)
  })

  it('counts words in plain text', () => {
    const s = computeStats('hello world this is a test')
    expect(s.words).toBe(6)
    expect(s.chars).toBe(26)
  })

  it('strips markdown punctuation from word count', () => {
    const md = '# Heading\n\n- one\n- two\n- three'
    const s = computeStats(md)
    expect(s.words).toBe(4)
    expect(s.chars).toBe(md.length)
  })

  it('strips code blocks from word count but keeps chars', () => {
    const md = 'before\n```\nconst x = 1;\nconst y = 2;\n```\nafter'
    const s = computeStats(md)
    expect(s.words).toBe(2)
    expect(s.chars).toBe(md.length)
  })

  it('estimates read minutes from word count', () => {
    const words = Array.from({ length: 200 }, () => 'w').join(' ')
    const s = computeStats(words)
    expect(s.readMinutes).toBe(1)
  })
})
