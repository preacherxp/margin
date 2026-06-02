import { onBeforeUnmount, shallowRef, watch, type ShallowRef } from 'vue'
import { useEditor, type Editor } from '@tiptap/vue-3'
import { buildExtensions, type ExtensionOptions } from './extensions'
import { getEditorMarkdown } from './markdownStorage'

export type EditorRef = ShallowRef<Editor | undefined>

export interface PostEditorOptions extends ExtensionOptions {
  initialMarkdown?: string
  editable?: boolean
  onUpdate?: (markdown: string) => void
}

export interface PostEditorApi {
  editor: EditorRef
  getMarkdown: () => string
  setMarkdown: (md: string) => void
  isReady: ShallowRef<boolean>
}

export function usePostEditor(options: PostEditorOptions = {}): PostEditorApi {
  const editor = useEditor({
    extensions: buildExtensions({ placeholder: options.placeholder }),
    editable: options.editable ?? true,
    content: options.initialMarkdown ?? '',
    onUpdate: ({ editor: ed }) => {
      const md = getEditorMarkdown(ed as unknown as Editor)
      options.onUpdate?.(md)
    },
  })

  const isReady = shallowRef(false)
  watch(
    editor,
    (ed) => {
      isReady.value = !!ed
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    editor.value?.destroy()
  })

  function getMarkdown(): string {
    const ed = editor.value
    if (!ed) return ''
    return getEditorMarkdown(ed)
  }

  function setMarkdown(md: string): void {
    const ed = editor.value
    if (!ed) return
    ed.commands.setContent(md ?? '', { emitUpdate: false })
  }

  return {
    editor,
    getMarkdown,
    setMarkdown,
    isReady,
  }
}
