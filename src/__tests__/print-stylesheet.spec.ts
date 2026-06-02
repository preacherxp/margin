import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PRINT_CSS_PATH = resolve(process.cwd(), 'src/styles/print.css')
const css = readFileSync(PRINT_CSS_PATH, 'utf8')

describe('print stylesheet', () => {
  it('uses @media print as its top-level guard', () => {
    expect(css).toMatch(/@media\s+print\s*\{/)
  })

  it('declares an @page rule with reasonable margins', () => {
    expect(css).toMatch(/@page\s*\{[^}]*margin[^}]*\}/)
  })

  it('hides the app top bar in print', () => {
    expect(css).toContain("[data-testid='top-bar']")
  })

  it('hides the editor bar in print', () => {
    expect(css).toContain("[data-testid='editor-bar']")
  })

  it('hides the metadata panel in print', () => {
    expect(css).toMatch(/data-testid='meta-panel'|data-testid='metadata-panel'/)
  })

  it('hides the status bar in print', () => {
    expect(css).toContain("[data-testid='status-bar']")
  })

  it('hides the version drawer in print', () => {
    expect(css).toContain("[data-testid='version-drawer']")
  })

  it('hides the LinkedIn export popover in print', () => {
    expect(css).toContain("[data-testid='linkedin-export-popover']")
  })

  it('exposes a generic data-print-hidden hook for ad-hoc hiding', () => {
    expect(css).toContain('[data-print-hidden]')
  })

  it('forces the page background to white for printers', () => {
    expect(css).toMatch(/background:\s*#ffffff\s*!important/)
  })

  it('forces dark text on light page', () => {
    expect(css).toMatch(/color:\s*#111111\s*!important/)
  })

  it('expands link URLs after the text when printed', () => {
    expect(css).toMatch(/a\[href\^='http'\]::after/)
    expect(css).toMatch(/content:\s*' \(' attr\(href\) '\)'/)
  })

  it('avoids breaking inside code blocks and images', () => {
    expect(css).toMatch(/page-break-inside:\s*avoid/)
  })

  it('keeps headings glued to the next paragraph', () => {
    expect(css).toMatch(/page-break-after:\s*avoid/)
  })

  it('hides .print-only on screen', () => {
    expect(css).toMatch(/@media\s+screen\s*\{[^}]*\.print-only[^}]*display:\s*none/s)
  })

  it('reveals .print-only when printing', () => {
    // inside the @media print block
    const printBlock = css.match(/@media\s+print\s*\{([\s\S]+)\}\s*$/)?.[1] ?? ''
    expect(printBlock).toMatch(/\.print-only\s*\{[^}]*display:\s*block/)
  })

  it('styles the print-only title with a serif font', () => {
    expect(css).toMatch(/\.print-only\s+\.print-title/)
    expect(css).toMatch(/font-family:\s*Georgia/)
  })

  it('renders the print-only tags as a hashtag list', () => {
    expect(css).toMatch(/\.print-only\s+\.print-tags\s+li::before/)
    expect(css).toMatch(/content:\s*'#'/)
  })
})
