import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Typography from '@tiptap/extension-typography'
import { Markdown } from 'tiptap-markdown'
import type { Extensions } from '@tiptap/core'

export interface ExtensionOptions {
  placeholder?: string
}

export function buildExtensions(options: ExtensionOptions = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: { HTMLAttributes: { class: 'tt-codeblock' } },
      horizontalRule: {},
    }),
    Markdown.configure({
      html: false,
      tightLists: true,
      breaks: false,
      linkify: false,
      transformPastedText: false,
      transformCopiedText: false,
    }),
    Placeholder.configure({
      placeholder:
        options.placeholder ?? 'Start writing… use / for blocks, markdown shortcuts work too',
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Image.configure({
      allowBase64: true,
      inline: false,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Typography,
  ]
}
