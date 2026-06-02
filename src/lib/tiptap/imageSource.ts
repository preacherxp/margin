export interface ImageSourceContext {
  postsDir: string | null
}

export function resolveImageSrc(rawSrc: string, ctx: ImageSourceContext): string {
  if (!rawSrc) return rawSrc
  if (/^(https?:|data:|tauri:|asset:|file:)/i.test(rawSrc)) return rawSrc
  if (!ctx.postsDir) return rawSrc
  if (rawSrc.startsWith('assets/') || rawSrc.startsWith('./assets/') || rawSrc.startsWith('../')) {
    return joinUrl(ctx.postsDir, normalizeRel(rawSrc))
  }
  return rawSrc
}

function normalizeRel(rel: string): string {
  if (rel.startsWith('./')) return rel.slice(2)
  if (rel.startsWith('../')) return rel
  return rel
}

function joinUrl(base: string, rel: string): string {
  const left = base.replace(/\/+$/, '')
  return `${left}/${rel}`.replace(/\/+/g, '/')
}
