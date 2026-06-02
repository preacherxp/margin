import { describe, it, expect } from 'vitest'
import {
  BUILT_IN_TEMPLATE_SLUGS,
  getBuiltInTemplate,
  listBuiltInTemplates,
  parseTemplate,
  serializeTemplate,
} from '@/lib/templates'
import type { Template } from '@/types/post'

const SAMPLE: Template = {
  slug: 'linkedin-story',
  name: 'LinkedIn Story',
  description: 'A personal story arc with a clear takeaway',
  type: 'linkedin',
  tags: ['story', 'personal'],
  isBuiltIn: false,
  path: '/Users/me/poster/templates/linkedin-story.md',
  linkedin: {
    hook: '',
    cta: "What's your version?",
    hashtags: ['#story', '#career'],
    audience: 'people who learn from stories',
  },
  body: 'Tell a short, true story.\n\n## Hook\n\n[First line.]\n',
}

describe('parseTemplate', () => {
  it('parses a valid template', () => {
    const content = serializeTemplate(SAMPLE)
    const { template, warnings } = parseTemplate(content, SAMPLE.path!)
    expect(warnings).toEqual([])
    expect(template.slug).toBe('linkedin-story')
    expect(template.name).toBe('LinkedIn Story')
    expect(template.description).toBe(SAMPLE.description)
    expect(template.type).toBe('linkedin')
    expect(template.tags).toEqual(['story', 'personal'])
    expect(template.linkedin.cta).toBe("What's your version?")
    expect(template.linkedin.hashtags).toEqual(['#story', '#career'])
    expect(template.body).toContain('Tell a short, true story.')
    expect(template.body).toContain('## Hook')
  })

  it('round-trips body content unchanged', () => {
    const content = serializeTemplate(SAMPLE)
    const { template } = parseTemplate(content, SAMPLE.path!)
    expect(template.body).toBe(SAMPLE.body.trim())
  })

  it('falls back to filename for slug when missing', () => {
    const content = `---
name: Anonymous
type: linkedin
isTemplate: true
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
---
body content
`
    const { template, warnings } = parseTemplate(content, '/tmp/anon-template.md')
    expect(template.slug).toBe('anon-template')
    expect(warnings).toEqual([])
  })

  it('warns when both slug and filename are missing', () => {
    const content = `---
name: Anonymous
type: linkedin
isTemplate: true
---
body
`
    const { template, warnings } = parseTemplate(content, '')
    expect(template.slug).toBe('')
    expect(warnings).toContain('template missing slug')
  })

  it('throws on missing delimiter', () => {
    expect(() => parseTemplate('not frontmatter', '/x')).toThrow(/missing frontmatter/)
  })

  it('throws on unterminated frontmatter', () => {
    expect(() => parseTemplate('---\nfoo: 1\n', '/x')).toThrow(/unterminated/)
  })

  it('defaults type to linkedin when invalid', () => {
    const content = `---
slug: foo
name: Foo
type: newsletter
isTemplate: true
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
---
body
`
    const { template } = parseTemplate(content, '/x')
    expect(template.type).toBe('linkedin')
  })

  it('accepts blog type', () => {
    const content = `---
slug: blog-essay
name: Blog Essay
description: Long-form
type: blog
isTemplate: true
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
---
# Essay
`
    const { template } = parseTemplate(content, '/x')
    expect(template.type).toBe('blog')
  })

  it('defaults tags to empty array', () => {
    const content = `---
slug: bare
name: Bare
type: linkedin
isTemplate: true
linkedin:
  hook: ""
  cta: ""
  hashtags: []
  audience: ""
---
body
`
    const { template } = parseTemplate(content, '/x')
    expect(template.tags).toEqual([])
  })

  it('serializes with isTemplate: true in frontmatter', () => {
    const content = serializeTemplate(SAMPLE)
    expect(content).toContain('isTemplate: true')
    expect(content).toContain('slug: linkedin-story')
    expect(content).toContain('type: linkedin')
  })

  it('strips trailing whitespace from body when serializing', () => {
    const t = { ...SAMPLE, body: 'hello\n\n\n' }
    const content = serializeTemplate(t)
    const { template } = parseTemplate(content, SAMPLE.path!)
    expect(template.body).toBe('hello')
  })
})

describe('built-in templates', () => {
  it('ships the 5 documented built-in slugs', () => {
    expect(BUILT_IN_TEMPLATE_SLUGS).toEqual([
      'linkedin-story',
      'linkedin-listicle',
      'linkedin-hot-take',
      'blog-how-to',
      'blog-essay',
    ])
  })

  it('lists 5 built-in templates', () => {
    const list = listBuiltInTemplates()
    expect(list).toHaveLength(5)
    for (const t of list) {
      expect(t.isBuiltIn).toBe(true)
      expect(t.path).toBeNull()
      expect(t.slug).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.type).toMatch(/linkedin|blog/)
    }
  })

  it('fetches a built-in template by slug', () => {
    const t = getBuiltInTemplate('linkedin-story')
    expect(t).not.toBeNull()
    expect(t?.slug).toBe('linkedin-story')
    expect(t?.isBuiltIn).toBe(true)
    expect(t?.type).toBe('linkedin')
    expect(t?.body).toContain('Hook')
  })

  it('returns null for unknown slugs', () => {
    expect(getBuiltInTemplate('nope-not-real')).toBeNull()
  })

  it('has a non-empty body for every built-in', () => {
    for (const t of listBuiltInTemplates()) {
      expect(t.body.length).toBeGreaterThan(20)
    }
  })

  it('built-in templates round-trip through serializeTemplate', () => {
    for (const t of listBuiltInTemplates()) {
      const content = serializeTemplate(t)
      const { template } = parseTemplate(content, `/tmp/${t.slug}.md`)
      expect(template.slug).toBe(t.slug)
      expect(template.name).toBe(t.name)
      expect(template.type).toBe(t.type)
      expect(template.tags).toEqual(t.tags)
      expect(template.body).toBe(t.body)
    }
  })
})
