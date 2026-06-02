const POSTS_DIR = 'posts'

export function resolvePostsDir(folder: string): string {
  const normalized = folder.replace(/\/+$/, '')
  const segments = normalized.split('/').filter(Boolean)
  const basename = segments[segments.length - 1]
  if (basename === POSTS_DIR) return normalized || folder
  return `${normalized}/${POSTS_DIR}`
}
