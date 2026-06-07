import { describe, it, expect } from 'vitest'
import {
  LINKEDIN_CHAR_LIMIT,
  LINKEDIN_SEE_MORE,
  buildLinkedinOutput,
  markdownToLinkedinText,
  normalizeHashtags,
  serializeLinkedin,
} from '@/lib/linkedin'
import type { Post } from '@/types/post'

function makePost(overrides: Partial<Post> = {}): Post {
  const base: Post = {
    id: '01HXY',
    title: 'Test post',
    status: 'draft',
    type: 'linkedin',
    createdAt: '2026-06-02T10:00:00.000Z',
    updatedAt: '2026-06-02T10:00:00.000Z',
    scheduledFor: null,
    publishedAt: null,
    tags: ['career'],
    template: null,
    path: '/posts/test.md',
    linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
    assets: [],
    versions: 0,
    body: '',
  }
  return { ...base, ...overrides, linkedin: { ...base.linkedin, ...overrides.linkedin } }
}

describe('normalizeHashtags', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeHashtags([])).toEqual([])
  })

  it('prepends # to plain words', () => {
    expect(normalizeHashtags(['ai', 'career'])).toEqual(['#ai', '#career'])
  })

  it('strips extra # characters', () => {
    expect(normalizeHashtags(['##ai', '###career'])).toEqual(['#ai', '#career'])
  })

  it('dedupes case-insensitively while preserving first occurrence', () => {
    expect(normalizeHashtags(['#AI', 'ai', '#Ai'])).toEqual(['#AI'])
  })

  it('removes empty or whitespace-only tags', () => {
    expect(normalizeHashtags(['', '   ', '#', '##'])).toEqual([])
  })

  it('strips internal whitespace', () => {
    expect(normalizeHashtags(['#a i'])).toEqual(['#ai'])
  })
})

describe('markdownToLinkedinText', () => {
  it('returns empty string for empty input', () => {
    expect(markdownToLinkedinText('')).toBe('')
  })

  it('strips bold and italic markers', () => {
    const md = '**bold** and *italic* and __also bold__ and _also italic_.'
    const out = markdownToLinkedinText(md)
    expect(out).toContain('bold')
    expect(out).toContain('italic')
    expect(out).toContain('also bold')
    expect(out).toContain('also italic')
    expect(out).not.toMatch(/\*\*/)
    expect(out).not.toMatch(/__/)
  })

  it('strips heading hashes', () => {
    const out = markdownToLinkedinText('# Title\n\n## Sub\n\ntext')
    expect(out).toContain('Title')
    expect(out).toContain('Sub')
    expect(out).toContain('text')
    expect(out).not.toMatch(/^#/m)
  })

  it('strips blockquote markers', () => {
    const out = markdownToLinkedinText('> quoted text\n> more')
    expect(out).toContain('quoted text')
    expect(out).toContain('more')
    expect(out).not.toMatch(/^>/m)
  })

  it('converts bullet lists to • items', () => {
    const md = '- one\n- two\n- three'
    const out = markdownToLinkedinText(md)
    expect(out).toMatch(/•\s+one/)
    expect(out).toMatch(/•\s+two/)
    expect(out).toMatch(/•\s+three/)
  })

  it('renumbers ordered lists and preserves the number', () => {
    const md = '5. five\n6. six\n7. seven'
    const out = markdownToLinkedinText(md)
    expect(out).toMatch(/^1\.\s+five/m)
    expect(out).toMatch(/^2\.\s+six/m)
    expect(out).toMatch(/^3\.\s+seven/m)
  })

  it('rewrites task list syntax to bullet', () => {
    const md = '- [ ] todo\n- [x] done'
    const out = markdownToLinkedinText(md)
    expect(out).toMatch(/•\s+todo/)
    expect(out).toMatch(/•\s+done/)
    expect(out).not.toMatch(/\[x?\]/)
  })

  it('rewrites image syntax to alt placeholder', () => {
    const out = markdownToLinkedinText('![My alt](assets/foo.png)')
    expect(out).toContain('[image: My alt]')
    expect(out).not.toContain('assets/foo.png')
  })

  it('strips image syntax without alt', () => {
    const out = markdownToLinkedinText('![](assets/foo.png)')
    expect(out).toContain('[image]')
  })

  it('rewrites link syntax to text and URL', () => {
    const out = markdownToLinkedinText('[click here](https://example.com)')
    expect(out).toContain('click here')
    expect(out).toContain('https://example.com')
    expect(out).not.toContain('[')
  })

  it('keeps URL only when link text equals URL', () => {
    const out = markdownToLinkedinText('[https://example.com](https://example.com)')
    expect(out.trim()).toBe('https://example.com')
  })

  it('strips inline code backticks but keeps the text', () => {
    const out = markdownToLinkedinText('use `npm test` to run')
    expect(out).toContain('npm test')
    expect(out).not.toContain('`')
  })

  it('converts fenced code block to indented block', () => {
    const md = 'before\n```\nconst x = 1\n```\nafter'
    const out = markdownToLinkedinText(md)
    expect(out).toContain('const x = 1')
    expect(out).not.toContain('```')
  })

  it('replaces horizontal rules with em-dash line', () => {
    const out = markdownToLinkedinText('above\n\n---\n\nbelow')
    expect(out).toContain('———')
    expect(out).not.toMatch(/^---$/m)
  })

  it('collapses 3+ blank lines to 2', () => {
    const md = 'a\n\n\n\n\nb'
    const out = markdownToLinkedinText(md)
    expect(out).toBe('a\n\nb')
  })

  it('strips strikethrough markers', () => {
    const out = markdownToLinkedinText('~~gone~~')
    expect(out).toContain('gone')
    expect(out).not.toContain('~~')
  })
})

describe('buildLinkedinOutput', () => {
  it('includes hook first when present', () => {
    const post = makePost({
      body: 'Body line one.\n\nBody line two.',
      linkedin: { hook: 'A short hook.', cta: '', hashtags: [], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.text.startsWith('A short hook.')).toBe(true)
    expect(out.text).toContain('Body line one.')
  })

  it('places CTA after body', () => {
    const post = makePost({
      body: 'Body.',
      linkedin: { hook: '', cta: 'What do you think?', hashtags: [], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    const bodyIdx = out.text.indexOf('Body.')
    const ctaIdx = out.text.indexOf('What do you think?')
    expect(bodyIdx).toBeGreaterThanOrEqual(0)
    expect(ctaIdx).toBeGreaterThan(bodyIdx)
  })

  it('appends hashtags at the end on a new line', () => {
    const post = makePost({
      body: 'Body.',
      linkedin: { hook: '', cta: '', hashtags: ['#ai', '#career'], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.text.endsWith('#ai #career')).toBe(true)
    expect(out.hashtags).toEqual(['#ai', '#career'])
  })

  it('orders: hook, body, cta, then hashtags', () => {
    const post = makePost({
      body: 'BODY',
      linkedin: { hook: 'HOOK', cta: 'CTA', hashtags: ['#tag'], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    const i = (s: string) => out.text.indexOf(s)
    expect(i('HOOK')).toBeLessThan(i('BODY'))
    expect(i('BODY')).toBeLessThan(i('CTA'))
    expect(i('CTA')).toBeLessThan(i('#tag'))
  })

  it('joins sections with blank lines', () => {
    const post = makePost({
      body: 'Body',
      linkedin: { hook: 'Hook', cta: 'CTA', hashtags: [], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.text).toBe('Hook\n\nBody\n\nCTA')
  })

  it('skips empty sections', () => {
    const post = makePost({
      body: 'Just the body.',
      linkedin: { hook: '', cta: '', hashtags: ['#x'], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.text).toBe('Just the body.\n\n#x')
  })

  it('handles only hashtags (no body, no hook, no cta)', () => {
    const post = makePost({
      body: '',
      linkedin: { hook: '', cta: '', hashtags: ['#a', '#b'], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.text).toBe('#a #b')
  })

  it('returns empty text and zero counts for empty post', () => {
    const out = buildLinkedinOutput(makePost())
    expect(out.text).toBe('')
    expect(out.chars).toBe(0)
    expect(out.words).toBe(0)
    expect(out.overLimit).toBe(false)
  })

  it('counts chars and words on real content', () => {
    const post = makePost({
      body: 'hello world this is a test',
      linkedin: { hook: '', cta: '', hashtags: ['#x'], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.chars).toBe(out.text.length)
    expect(out.words).toBe(7)
  })

  it('marks overLimit when chars exceed LinkedIn limit', () => {
    const big = 'x'.repeat(LINKEDIN_CHAR_LIMIT + 10)
    const out = buildLinkedinOutput(
      makePost({ body: big, linkedin: { hook: '', cta: '', hashtags: [], audience: '' } }),
    )
    expect(out.overLimit).toBe(true)
    expect(out.chars).toBeGreaterThan(LINKEDIN_CHAR_LIMIT)
  })

  it('does not mark overLimit when at or below limit', () => {
    const ok = 'x'.repeat(LINKEDIN_CHAR_LIMIT)
    const out = buildLinkedinOutput(
      makePost({ body: ok, linkedin: { hook: '', cta: '', hashtags: [], audience: '' } }),
    )
    expect(out.overLimit).toBe(false)
  })

  it('normalizes hashtags from the post', () => {
    const post = makePost({
      body: 'body',
      linkedin: { hook: '', cta: '', hashtags: ['AI', 'ai', '##career'], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.hashtags).toEqual(['#AI', '#career'])
    expect(out.text).toContain('#AI #career')
  })

  it('strips markdown in the body for the output', () => {
    const post = makePost({
      body: '**bold** and *italic*\n\n- item one\n- item two',
      linkedin: { hook: 'HOOK', cta: '', hashtags: [], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.text).toContain('HOOK')
    expect(out.text).toContain('bold')
    expect(out.text).toContain('italic')
    expect(out.text).toMatch(/•\s+item one/)
    expect(out.text).toMatch(/•\s+item two/)
    expect(out.text).not.toMatch(/\*\*/)
  })

  it('dedents indented body content', () => {
    const post = makePost({
      body: '    indented line one\n    indented line two',
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.text.startsWith('indented line one')).toBe(true)
    expect(out.text).toContain('indented line two')
  })

  it('preserves internal line breaks (LinkedIn rhythm)', () => {
    const post = makePost({
      body: 'line one\nline two\nline three',
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
    })
    const out = buildLinkedinOutput(post)
    expect(out.text).toContain('line one\nline two\nline three')
  })
})

describe('serializeLinkedin', () => {
  it('returns the same text as buildLinkedinOutput(post).text', () => {
    const post = makePost({
      body: 'body',
      linkedin: { hook: 'h', cta: 'c', hashtags: ['#a'], audience: '' },
    })
    expect(serializeLinkedin(post)).toBe(buildLinkedinOutput(post).text)
  })
})

describe('LinkedIn constants', () => {
  it('has a 3000 char limit', () => {
    expect(LINKEDIN_CHAR_LIMIT).toBe(3000)
  })

  it('has a 210 char see-more threshold', () => {
    expect(LINKEDIN_SEE_MORE).toBe(210)
  })
})
