import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest'
import { Editor } from '@tiptap/vue-3'
import { buildExtensions } from '@/lib/tiptap/extensions'
import { getEditorMarkdown } from '@/lib/tiptap/markdownStorage'

beforeAll(() => {
  if (typeof document !== 'undefined' && typeof document.elementFromPoint !== 'function') {
    document.elementFromPoint = () => null
  }
  if (
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.scrollIntoView !== 'function'
  ) {
    HTMLElement.prototype.scrollIntoView = function () {}
  }
})

function newEditor(initial = '') {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return new Editor({
    element: el,
    extensions: buildExtensions(),
    content: initial,
  })
}

describe('markdown round-trip', () => {
  let editor: Editor

  beforeEach(() => {
    editor = newEditor()
  })

  afterEach(() => {
    editor.destroy()
  })

  it('parses a heading on load', () => {
    editor.commands.setContent('# Hello world')
    expect(editor.getHTML()).toContain('<h1>')
    expect(editor.getHTML()).toContain('Hello world')
  })

  it('serializes back to markdown', () => {
    editor.commands.setContent('# Hello world\n\nThis is a paragraph.')
    const md = getEditorMarkdown(editor)
    expect(md).toContain('# Hello world')
    expect(md).toContain('This is a paragraph.')
  })

  it('round-trips bold and italic', () => {
    editor.commands.setContent('**bold** and *italic*')
    const md = getEditorMarkdown(editor)
    expect(md).toContain('**bold**')
    expect(md).toContain('*italic*')
  })

  it('round-trips bullet list', () => {
    editor.commands.setContent('- one\n- two\n- three')
    const md = getEditorMarkdown(editor)
    expect(md).toMatch(/-\s+one/)
    expect(md).toMatch(/-\s+two/)
    expect(md).toMatch(/-\s+three/)
  })

  it('round-trips task list', () => {
    editor.commands.setContent('- [ ] todo\n- [x] done')
    const md = getEditorMarkdown(editor)
    expect(md).toMatch(/-\s+\[ \]\s+todo/)
    expect(md).toMatch(/-\s+\[x\]\s+done/)
  })

  it('round-trips a blockquote', () => {
    editor.commands.setContent('> quoted text')
    const md = getEditorMarkdown(editor)
    expect(md).toContain('> quoted text')
  })

  it('round-trips a code block', () => {
    editor.commands.setContent('```\nconst x = 1\n```')
    const md = getEditorMarkdown(editor)
    expect(md).toContain('```')
    expect(md).toContain('const x = 1')
  })

  it('preserves inline code', () => {
    editor.commands.setContent('use `npm test` to run')
    const md = getEditorMarkdown(editor)
    expect(md).toContain('`npm test`')
  })

  it('round-trips links', () => {
    editor.commands.setContent('[click here](https://example.com)')
    const md = getEditorMarkdown(editor)
    expect(md).toContain('[click here](https://example.com)')
  })

  it('round-trips a horizontal rule', () => {
    editor.commands.setContent('above\n\n---\n\nbelow')
    const md = getEditorMarkdown(editor)
    expect(md).toContain('---')
  })

  it('emits update events on input', () => {
    const updates: string[] = []
    editor.on('update', () => {
      updates.push(getEditorMarkdown(editor))
    })
    editor.commands.setContent('# title')
    editor.commands.insertContent('\n\nbody text')
    expect(updates.length).toBeGreaterThan(0)
  })
})
