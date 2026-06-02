import { describe, it, expect, beforeEach } from 'vitest'
import {
  deleteUserTemplate,
  ensureTemplatesDir,
  listTemplates,
  readTemplateBySlug,
  resetMockData,
  writeUserTemplate,
} from '@/lib/tauri-bridge'
import { BUILT_IN_TEMPLATE_SLUGS } from '@/lib/templates'

describe('tauri-bridge templates (mock mode)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMockData()
  })

  it('listTemplates returns built-ins even with no folder', async () => {
    const list = await listTemplates('/mock/posts')
    expect(list.length).toBe(BUILT_IN_TEMPLATE_SLUGS.length)
    for (const t of list) {
      expect(t.isBuiltIn).toBe(true)
    }
  })

  it('readTemplateBySlug returns a built-in when slug matches', async () => {
    const t = await readTemplateBySlug('linkedin-listicle', '/mock/posts')
    expect(t.slug).toBe('linkedin-listicle')
    expect(t.isBuiltIn).toBe(true)
    expect(t.body.length).toBeGreaterThan(0)
  })

  it('readTemplateBySlug throws for an unknown slug', async () => {
    await expect(readTemplateBySlug('not-a-real-slug', '/mock/posts')).rejects.toThrow(
      /template not found/,
    )
  })

  it('writeUserTemplate persists a user template and listTemplates surfaces it', async () => {
    const path = await writeUserTemplate('/mock/posts', 'my-template', {
      slug: 'my-template',
      name: 'My Template',
      description: 'Custom',
      type: 'blog',
      tags: ['custom'],
      isBuiltIn: false,
      path: '',
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
      body: '## Intro\n\nBody text.\n',
    })
    expect(path).toContain('my-template.md')

    const list = await listTemplates('/mock/posts')
    const mine = list.find((t) => t.slug === 'my-template')
    expect(mine).toBeDefined()
    expect(mine?.isBuiltIn).toBe(false)
    expect(mine?.name).toBe('My Template')

    const full = await readTemplateBySlug('my-template', '/mock/posts')
    expect(full.body).toContain('Body text.')
  })

  it('deleteUserTemplate removes a user template', async () => {
    const path = await writeUserTemplate('/mock/posts', 'to-delete', {
      slug: 'to-delete',
      name: 'To Delete',
      description: '',
      type: 'linkedin',
      tags: [],
      isBuiltIn: false,
      path: '',
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
      body: 'body',
    })
    let list = await listTemplates('/mock/posts')
    expect(list.find((t) => t.slug === 'to-delete')).toBeDefined()
    await deleteUserTemplate(path)
    list = await listTemplates('/mock/posts')
    expect(list.find((t) => t.slug === 'to-delete')).toBeUndefined()
  })

  it('ensureTemplatesDir returns a deterministic path', async () => {
    const dir = await ensureTemplatesDir('/mock/posts')
    expect(dir).toContain('templates')
  })

  it('sanitizes dangerous characters in user template slugs', async () => {
    const path = await writeUserTemplate('/mock/posts', '../../etc/passwd', {
      slug: '../../etc/passwd',
      name: 'Bad',
      description: '',
      type: 'linkedin',
      tags: [],
      isBuiltIn: false,
      path: '',
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
      body: 'body',
    })
    expect(path).not.toContain('..')
    expect(path).not.toContain('/etc/')
    const filename = path.split('/').pop() ?? ''
    expect(filename).toMatch(/^[a-zA-Z0-9_-]+\.md$/)
    expect(filename).not.toMatch(/^\.+$/)
  })
})
