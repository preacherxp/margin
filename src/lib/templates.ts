import { parse, stringify } from 'yaml'
import type { LinkedinMeta, PostType, Template, TemplateMeta } from '@/types/post'

const DELIM = '---'
const EMPTY_LINKEDIN: LinkedinMeta = { hook: '', cta: '', hashtags: [], audience: '' }

const BUILT_IN_RAW: Record<string, string> = import.meta.glob(
  '/src/templates/*.md',
  { query: '?raw', import: 'default', eager: true },
)

export const BUILT_IN_TEMPLATE_SLUGS = [
  'linkedin-story',
  'linkedin-listicle',
  'linkedin-hot-take',
  'blog-how-to',
  'blog-essay',
] as const

export type BuiltInTemplateSlug = (typeof BUILT_IN_TEMPLATE_SLUGS)[number]

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

function normalizeType(v: unknown): PostType {
  return v === 'linkedin' || v === 'blog' ? v : 'linkedin'
}

function slugFromPath(path: string | null | undefined): string {
  if (!path) return ''
  const m = path.match(/([^/]+)\.md$/)
  return m ? m[1] ?? '' : ''
}

export interface ParseTemplateResult {
  template: Template
  warnings: string[]
}

export function parseTemplate(content: string, fallbackPath = ''): ParseTemplateResult {
  const warnings: string[] = []
  const trimmed = content.replace(/^\ufeff/, '')
  if (!trimmed.startsWith(DELIM)) {
    throw new Error('missing frontmatter delimiter')
  }
  const rest = trimmed.slice(DELIM.length).replace(/^[\n\r]+/, '')
  const end = rest.indexOf(`\n${DELIM}`)
  if (end === -1) throw new Error('unterminated frontmatter')
  const yamlStr = rest.slice(0, end)
  const body = rest
    .slice(end + 1 + DELIM.length)
    .replace(/^\n+/, '')
    .replace(/\s+$/, '')

  const data = (parse(yamlStr) ?? {}) as Record<string, unknown>

  const slug = asString(data.slug) || slugFromPath(fallbackPath)
  if (!slug) warnings.push('template missing slug')

  const name = asString(data.name, slug || 'Untitled template')
  const description = asString(data.description)
  const type = normalizeType(data.type)
  const tags = asStringArray(data.tags)

  const linkedinRaw = (data.linkedin ?? {}) as Record<string, unknown>
  const linkedin: LinkedinMeta = {
    hook: asString(linkedinRaw.hook),
    cta: asString(linkedinRaw.cta),
    hashtags: asStringArray(linkedinRaw.hashtags),
    audience: asString(linkedinRaw.audience),
  }

  const template: Template = {
    slug,
    name,
    description,
    type,
    tags,
    isBuiltIn: false,
    path: fallbackPath || null,
    linkedin,
    body,
  }

  return { template, warnings }
}

export function serializeTemplate(t: Template): string {
  const obj: Record<string, unknown> = {
    slug: t.slug,
    name: t.name,
    description: t.description,
    type: t.type,
    tags: t.tags,
    isTemplate: true,
    linkedin: t.linkedin,
  }
  const yaml = stringify(obj, { lineWidth: 0 }).trimEnd()
  const body = t.body.replace(/\s+$/, '')
  const sep = body.length > 0 ? '\n' : ''
  return `${DELIM}\n${yaml}\n${DELIM}\n${body}${sep}`
}

function builtInPath(slug: string): string {
  return `/src/templates/${slug}.md`
}

function metaOf(t: Template): TemplateMeta {
  return {
    slug: t.slug,
    name: t.name,
    description: t.description,
    type: t.type,
    tags: t.tags,
    isBuiltIn: t.isBuiltIn,
    path: t.path,
  }
}

export function listBuiltInTemplates(): Template[] {
  const out: Template[] = []
  for (const slug of BUILT_IN_TEMPLATE_SLUGS) {
    const path = builtInPath(slug)
    const raw = BUILT_IN_RAW[path]
    if (!raw) continue
    try {
      const { template } = parseTemplate(raw, `built-in:${slug}`)
      template.isBuiltIn = true
      template.path = null
      out.push(template)
    } catch {
      // skip malformed built-in (should never happen in shipped files)
    }
  }
  return out
}

export function getBuiltInTemplate(slug: string): Template | null {
  if (!(BUILT_IN_TEMPLATE_SLUGS as readonly string[]).includes(slug)) return null
  const raw = BUILT_IN_RAW[builtInPath(slug)]
  if (!raw) return null
  const { template } = parseTemplate(raw, `built-in:${slug}`)
  template.isBuiltIn = true
  template.path = null
  return template
}

export function getTemplateMeta(t: Template): TemplateMeta {
  return metaOf(t)
}

export function emptyLinkedinTemplate(): LinkedinMeta {
  return { ...EMPTY_LINKEDIN }
}
