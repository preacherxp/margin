import type { Editor } from '@tiptap/vue-3'

export interface MarkdownStorageShape {
  options: Record<string, unknown>
  parser: { parse: (md: string, opts?: Record<string, unknown>) => unknown }
  serializer: { serialize: (doc: unknown) => string }
  getMarkdown: () => string
}

export function getMarkdownStorage(ed: Editor): MarkdownStorageShape | undefined {
  const storage = ed.storage as unknown as Record<string, unknown>
  const md = storage.markdown
  if (!md || typeof md !== 'object') return undefined
  return md as MarkdownStorageShape
}

export function getEditorMarkdown(ed: Editor): string {
  return getMarkdownStorage(ed)?.getMarkdown() ?? ''
}
