export interface PostStats {
  words: number
  chars: number
  readMinutes: number
}

const WORDS_PER_MINUTE = 200

export function computeStats(markdown: string): PostStats {
  const text = markdown.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~\-[\]()!]/g, ' ')
  const trimmed = text.trim()
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
  const chars = markdown.length
  const readMinutes = words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  return { words, chars, readMinutes }
}
