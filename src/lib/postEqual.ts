import type { LinkedinMeta, Post } from '@/types/post'

/**
 * Cheap field-by-field equality for {@link Post} values.
 *
 * Used as the autosave equality check that runs on every keystroke.
 * Avoids the `JSON.stringify` round-trip the previous implementation paid
 * for, which allocated a copy of the entire post (frontmatter + body)
 * on every change. For a 50 KB body that was the dominant cost in the
 * editor frame budget.
 *
 * The check is intentionally conservative: it returns `false` whenever
 * any scalar, array, or object field could have changed, so the caller
 * will fall through to the next stage (serialise + persist). The common
 * no-op path — a re-render that didn't actually mutate anything — stays
 * O(1) and allocation-free.
 */
export function postEqual(a: Post | null | undefined, b: Post | null | undefined): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (
    a.id !== b.id ||
    a.path !== b.path ||
    a.title !== b.title ||
    a.status !== b.status ||
    a.type !== b.type ||
    a.createdAt !== b.createdAt ||
    a.updatedAt !== b.updatedAt ||
    a.scheduledFor !== b.scheduledFor ||
    a.publishedAt !== b.publishedAt ||
    a.template !== b.template ||
    a.versions !== b.versions ||
    a.body.length !== b.body.length
  ) {
    return false
  }
  if (!shallowStringArrayEqual(a.tags, b.tags)) return false
  if (!shallowStringArrayEqual(a.assets, b.assets)) return false
  if (!linkedinEqual(a.linkedin, b.linkedin)) return false
  return bodyEqual(a.body, b.body)
}

function shallowStringArrayEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function linkedinEqual(a: LinkedinMeta, b: LinkedinMeta): boolean {
  if (a === b) return true
  if (
    a.hook !== b.hook ||
    a.cta !== b.cta ||
    a.audience !== b.audience ||
    a.hashtags.length !== b.hashtags.length
  ) {
    return false
  }
  for (let i = 0; i < a.hashtags.length; i += 1) {
    if (a.hashtags[i] !== b.hashtags[i]) return false
  }
  return true
}

/**
 * Body equality. Lengths already match by the time we get here. We
 * only need a couple of cheap probes to catch a same-length edit in
 * the common case — a typed-character edit will change one of them.
 * Falls back to full string compare if both probes match (rare; only
 * fires when the edit lands outside the probed windows).
 */
function bodyEqual(a: string, b: string): boolean {
  if (a === b) return true
  const len = a.length
  if (len <= 256) return a === b
  const head = 128
  const tail = 128
  if (a.slice(0, head) !== b.slice(0, head)) return false
  if (a.slice(len - tail) !== b.slice(len - tail)) return false
  return a === b
}
