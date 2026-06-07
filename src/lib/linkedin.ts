import type { Post } from '@/types/post'

export const LINKEDIN_CHAR_LIMIT = 3000
export const LINKEDIN_SEE_MORE = 210

export interface LinkedinOutput {
  text: string
  chars: number
  words: number
  overLimit: boolean
  hashtags: string[]
}

function normalizeHashtag(tag: string): string | null {
  const cleaned = tag.trim().replace(/^#+/, '').replace(/\s+/g, '')
  if (!cleaned) return null
  return `#${cleaned}`
}

export function normalizeHashtags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = normalizeHashtag(raw)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  return out
}

function stripCodeBlocks(md: string): string {
  return md.replace(/```[\s\S]*?```/g, (block) => {
    const inner = block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
    return inner
      .split('\n')
      .map((l) => `    ${l}`)
      .join('\n')
  })
}

function stripInlineCode(md: string): string {
  return md.replace(/`([^`\n]+)`/g, '$1')
}

function stripImages(md: string): string {
  return md.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_m, alt: string) => {
    const text = (alt ?? '').trim()
    return text ? `[image: ${text}]` : '[image]'
  })
}

function stripLinks(md: string): string {
  return md.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const t = (text ?? '').trim()
    if (t === url) return url
    return `${t} (${url})`
  })
}

function stripHeadingHashes(md: string): string {
  return md.replace(/^#{1,6}\s+/gm, '')
}

function stripBlockquoteMarkers(md: string): string {
  return md.replace(/^\s*>\s?/gm, '')
}

function transformLists(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let orderedCounter = 0
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    const taskMatch = line.match(/^(\s*)-\s+\[(?:[ xX])\]\s+(.*)$/)
    if (taskMatch) {
      const indent = taskMatch[1] ?? ''
      const body = taskMatch[2] ?? ''
      out.push(`${indent}• ${body}`)
      orderedCounter = 0
      continue
    }
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/)
    if (bulletMatch) {
      const indent = bulletMatch[1] ?? ''
      const body = bulletMatch[2] ?? ''
      out.push(`${indent}• ${body}`)
      orderedCounter = 0
      continue
    }
    const orderedMatch = line.match(/^(\s*)\d+[.)]\s+(.*)$/)
    if (orderedMatch) {
      orderedCounter += 1
      const indent = orderedMatch[1] ?? ''
      const body = orderedMatch[2] ?? ''
      out.push(`${indent}${orderedCounter}. ${body}`)
      continue
    }
    out.push(raw)
    orderedCounter = 0
  }
  return out.join('\n')
}

function stripEmphasis(md: string): string {
  return md
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?;:]|$)/g, '$1$2')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, '$1$2')
    .replace(/~~([^~\n]+)~~/g, '$1')
}

function stripHorizontalRules(md: string): string {
  return md.replace(/^\s*([-*_])\s*\1\s*\1[\s\-_*]*$/gm, '———')
}

function collapseBlankLines(md: string): string {
  return md.replace(/\n{3,}/g, '\n\n')
}

function trimLines(md: string): string {
  return md
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/^\s+|\s+$/g, '')
}

export function markdownToLinkedinText(md: string): string {
  if (!md) return ''
  let out = md.replace(/\r\n?/g, '\n')
  out = stripCodeBlocks(out)
  out = stripImages(out)
  out = stripLinks(out)
  out = stripHeadingHashes(out)
  out = stripBlockquoteMarkers(out)
  out = transformLists(out)
  out = stripHorizontalRules(out)
  out = stripInlineCode(out)
  out = stripEmphasis(out)
  out = trimLines(out)
  out = collapseBlankLines(out)
  return out
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function dedent(s: string): string {
  const lines = s.split('\n')
  const nonEmpty = lines.filter((l) => l.trim().length > 0)
  if (nonEmpty.length === 0) return s.trim()
  const minIndent = nonEmpty.reduce((m, l) => {
    const match = l.match(/^[ \t]+/)
    const len = match ? match[0].length : 0
    return Math.min(m, len)
  }, Infinity)
  if (!Number.isFinite(minIndent) || minIndent === 0) return s
  return lines.map((l) => (l.startsWith(' '.repeat(minIndent)) ? l.slice(minIndent) : l)).join('\n')
}

export function buildLinkedinOutput(post: Post): LinkedinOutput {
  const bodyText = dedent(markdownToLinkedinText(post.body ?? ''))
  const hook = (post.linkedin.hook ?? '').trim()
  const cta = (post.linkedin.cta ?? '').trim()
  const tags = normalizeHashtags(post.linkedin.hashtags ?? [])

  const sections: string[] = []
  if (hook) sections.push(hook)
  if (bodyText) sections.push(bodyText)
  if (cta) sections.push(cta)

  let text = sections.join('\n\n')
  if (tags.length > 0) {
    text = text.length > 0 ? `${text}\n\n${tags.join(' ')}` : tags.join(' ')
  }

  return {
    text,
    chars: text.length,
    words: countWords(text),
    overLimit: text.length > LINKEDIN_CHAR_LIMIT,
    hashtags: tags,
  }
}

export function serializeLinkedin(post: Post): string {
  return buildLinkedinOutput(post).text
}
