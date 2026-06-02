import { parseFrontmatter } from './frontmatter'
import type { Post } from '@/types/post'

export interface DiffLine {
  kind: 'eq' | 'add' | 'del'
  value: string
  oldIndex: number | null
  newIndex: number | null
}

export interface DiffSummary {
  added: number
  removed: number
  unchanged: number
}

export function splitLines(s: string): string[] {
  if (s === '') return []
  const parts = s.split('\n')
  if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop()
  return parts
}

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = splitLines(oldText)
  const b = splitLines(newText)
  const n = a.length
  const m = b.length

  const dp: Uint32Array[] = []
  for (let i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i]![j] = (dp[i + 1]?.[j + 1] ?? 0) + 1
      } else {
        const down = dp[i + 1]?.[j] ?? 0
        const right = dp[i]?.[j + 1] ?? 0
        dp[i]![j] = down >= right ? down : right
      }
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'eq', value: a[i] ?? '', oldIndex: i, newIndex: j })
      i++
      j++
    } else {
      const down = dp[i + 1]?.[j] ?? 0
      const right = dp[i]?.[j + 1] ?? 0
      if (down >= right) {
        out.push({ kind: 'del', value: a[i] ?? '', oldIndex: i, newIndex: null })
        i++
      } else {
        out.push({ kind: 'add', value: b[j] ?? '', oldIndex: null, newIndex: j })
        j++
      }
    }
  }
  while (i < n) {
    out.push({ kind: 'del', value: a[i] ?? '', oldIndex: i, newIndex: null })
    i++
  }
  while (j < m) {
    out.push({ kind: 'add', value: b[j] ?? '', oldIndex: null, newIndex: j })
    j++
  }
  return out
}

export function summarizeDiff(lines: DiffLine[]): DiffSummary {
  let added = 0
  let removed = 0
  let unchanged = 0
  for (const l of lines) {
    if (l.kind === 'add') added++
    else if (l.kind === 'del') removed++
    else unchanged++
  }
  return { added, removed, unchanged }
}

export interface BodyDiff {
  lines: DiffLine[]
  summary: DiffSummary
}

export function diffPostBodies(prev: Post, next: Post): BodyDiff {
  const lines = diffLines(prev.body, next.body)
  return { lines, summary: summarizeDiff(lines) }
}

export function diffRawContent(oldText: string, newText: string): BodyDiff {
  const lines = diffLines(oldText, newText)
  return { lines, summary: summarizeDiff(lines) }
}

export function formatVersionTs(ts: string): string {
  if (!ts || ts.length < 19) return ts
  const date = ts.slice(0, 10)
  const time = ts.slice(11, 19).replace(/-/g, ':')
  return `${date} ${time}Z`
}

export function safeFileTsForDate(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}` +
    `.${pad(d.getUTCMilliseconds(), 3)}Z`
  )
}

export function parseSnapshot(content: string, fallbackPath = ''): Post | null {
  try {
    const parsed = parseFrontmatter(content, fallbackPath)
    return {
      ...parsed.meta,
      linkedin: parsed.linkedin,
      assets: parsed.assets,
      versions: parsed.versions,
      body: parsed.body,
    }
  } catch {
    return null
  }
}
