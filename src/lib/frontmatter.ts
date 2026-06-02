import { parse, stringify } from 'yaml'
import type { Post, PostMeta, LinkedinMeta } from '@/types/post'

const DELIM = '---'
const EMPTY_LINKEDIN: LinkedinMeta = { hook: '', cta: '', hashtags: [], audience: '' }

export interface ParsedFrontmatter {
  meta: PostMeta
  linkedin: LinkedinMeta
  assets: string[]
  versions: number
  body: string
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function normalizeStatus(v: unknown): PostMeta['status'] {
  if (v === 'draft' || v === 'scheduled' || v === 'published' || v === 'archived') return v
  return 'draft'
}

function normalizeType(v: unknown): PostMeta['type'] {
  if (v === 'linkedin' || v === 'blog') return v
  return 'linkedin'
}

export function parseFrontmatter(content: string, fallbackPath = ''): ParsedFrontmatter {
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

  const meta: PostMeta = {
    id: asString(data.id),
    title: asString(data.title, 'Untitled'),
    status: normalizeStatus(data.status),
    type: normalizeType(data.type),
    createdAt: asString(data.createdAt),
    updatedAt: asString(data.updatedAt),
    scheduledFor: typeof data.scheduledFor === 'string' ? data.scheduledFor : null,
    publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : null,
    tags: asStringArray(data.tags),
    template: typeof data.template === 'string' ? data.template : null,
    path: asString(data.path, fallbackPath),
  }

  const linkedinRaw = (data.linkedin ?? {}) as Record<string, unknown>
  const linkedin: LinkedinMeta = {
    hook: asString(linkedinRaw.hook),
    cta: asString(linkedinRaw.cta),
    hashtags: asStringArray(linkedinRaw.hashtags),
    audience: asString(linkedinRaw.audience),
  }

  const assets = asStringArray(data.assets)
  const versions = asNumber(data.versions)

  return { meta, linkedin, assets, versions, body }
}

export function serializeFrontmatter(post: Post): string {
  const obj: Record<string, unknown> = {
    id: post.id,
    title: post.title,
    status: post.status,
    type: post.type,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    scheduledFor: post.scheduledFor,
    publishedAt: post.publishedAt,
    tags: post.tags,
    template: post.template,
    path: post.path,
    linkedin: post.linkedin,
    assets: post.assets,
    versions: post.versions,
  }
  const yaml = stringify(obj, { lineWidth: 0 }).trimEnd()
  const body = post.body.replace(/\s+$/, '')
  const sep = body.length > 0 ? '\n' : ''
  return `${DELIM}\n${yaml}\n${DELIM}\n${body}${sep}`
}

export function emptyLinkedin(): LinkedinMeta {
  return { ...EMPTY_LINKEDIN }
}
