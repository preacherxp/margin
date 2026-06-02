import type { Post, PostMeta, Template, TemplateMeta, VersionContent, VersionMeta } from '@/types/post'
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/settings'
import { resolvePostsDir } from './posts-dir'
import { SAMPLE_POSTS } from './mock-data'
import { getBuiltInTemplate, listBuiltInTemplates, serializeTemplate } from './templates'

const MOCK_POSTS_KEY = 'margin:posts'
const MOCK_SEEDED_KEY = 'margin:posts:seeded'
const MOCK_SETTINGS_KEY = 'margin:settings'
const MOCK_TEMPLATES_KEY = 'margin:templates'
const MOCK_VERSIONS_KEY = 'margin:versions'
const MOCK_VERSIONS_CONTENT_KEY = 'margin:version-content'
const MOCK_FOLDER = '/mock/posts'
const MOCK_TEMPLATES_DIR = '/mock/templates'

const MAX_VERSIONS_PER_POST = 50

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function readMockPosts(): Post[] {
  const raw = localStorage.getItem(MOCK_POSTS_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Post[]
    } catch {
      return []
    }
  }
  if (localStorage.getItem(MOCK_SEEDED_KEY) !== '1') {
    localStorage.setItem(MOCK_POSTS_KEY, JSON.stringify(SAMPLE_POSTS))
    localStorage.setItem(MOCK_SEEDED_KEY, '1')
    return [...SAMPLE_POSTS]
  }
  return []
}

function writeMockPosts(posts: Post[]): void {
  localStorage.setItem(MOCK_POSTS_KEY, JSON.stringify(posts))
  localStorage.setItem(MOCK_SEEDED_KEY, '1')
}

function readMockSettings(): AppSettings {
  const raw = localStorage.getItem(MOCK_SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as AppSettings) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function writeMockSettings(settings: AppSettings): void {
  localStorage.setItem(MOCK_SETTINGS_KEY, JSON.stringify(settings))
}

function readMockTemplates(): Template[] {
  const raw = localStorage.getItem(MOCK_TEMPLATES_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Template[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeMockTemplates(templates: Template[]): void {
  localStorage.setItem(MOCK_TEMPLATES_KEY, JSON.stringify(templates))
}

function mockTemplateMeta(t: Template): TemplateMeta {
  return {
    slug: t.slug,
    name: t.name,
    description: t.description,
    type: t.type,
    tags: t.tags,
    isBuiltIn: t.isBuiltIn,
    path: t.path,
  }
}

export async function pickFolder(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const result = await open({ directory: true, multiple: false })
    if (typeof result === 'string') return result
    return null
  }
  return MOCK_FOLDER
}

export async function loadSettings(): Promise<AppSettings> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const raw = await invoke<{ postsFolder: string | null; theme: string | null }>('get_settings')
    return {
      postsFolder: raw.postsFolder,
      theme:
        raw.theme === 'dark' || raw.theme === 'light' || raw.theme === 'system'
          ? raw.theme
          : 'dark',
    }
  }
  return readMockSettings()
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('save_settings', {
      settings: {
        postsFolder: settings.postsFolder,
        theme: settings.theme,
      },
    })
    return
  }
  writeMockSettings(settings)
}

export async function listPosts(folder: string): Promise<PostMeta[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<PostMeta[]>('list_posts', { folder })
  }
  return readMockPosts()
    .map((p) => metaFromPost(p))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function readPost(path: string): Promise<Post> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<Post>('read_post', { path })
  }
  const post = readMockPosts().find((p) => p.path === path)
  if (!post) throw new Error(`post not found: ${path}`)
  return post
}

export async function writePost(path: string, content: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('write_post', { path, content })
    return
  }
  const { parseFrontmatter } = await import('./frontmatter')
  const parsed = parseFrontmatter(content, path)
  const posts = readMockPosts()
  const idx = posts.findIndex((p) => p.path === path)
  const post: Post = {
    ...parsed.meta,
    linkedin: parsed.linkedin,
    assets: parsed.assets,
    versions: parsed.versions,
    body: parsed.body,
  }
  if (idx >= 0) {
    posts[idx] = post
  } else {
    posts.push(post)
  }
  writeMockPosts(posts)
}

export async function deletePost(path: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('delete_post', { path })
    return
  }
  const posts = readMockPosts().filter((p) => p.path !== path)
  writeMockPosts(posts)
}

export async function ensurePostsDir(folder: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string>('ensure_posts_dir', { folder })
  }
  return resolvePostsDir(folder)
}

export interface CopiedAsset {
  relPath: string
  absPath: string
  name: string
}

export async function copyAsset(src: string, destDir: string): Promise<CopiedAsset> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<CopiedAsset>('copy_asset', { src, destDir })
  }
  const name = src.split('/').pop() ?? 'pasted.png'
  return { relPath: `assets/${name}`, absPath: `${destDir}/${name}`, name }
}

export async function ensureAssetsDir(postsDir: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string>('ensure_assets_dir', { postsDir })
  }
  return `${postsDir}/assets`
}

export async function listTemplates(folder: string): Promise<TemplateMeta[]> {
  const builtIns = listBuiltInTemplates().map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    type: t.type,
    tags: t.tags,
    isBuiltIn: true,
    path: null,
  }))
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const user = await invoke<TemplateMeta[]>('list_templates', { folder })
    return [...builtIns, ...user]
  }
  const user = readMockTemplates().map(mockTemplateMeta)
  return [...builtIns, ...user]
}

export async function readTemplateBySlug(slug: string, folder: string): Promise<Template> {
  const builtIn = getBuiltInTemplate(slug)
  if (builtIn) return builtIn
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const userMetas = await invoke<TemplateMeta[]>('list_templates', { folder })
    const meta = userMetas.find((m) => m.slug === slug && !m.isBuiltIn)
    if (!meta?.path) throw new Error(`template not found: ${slug}`)
    const tpl = await invoke<Template>('read_template', { path: meta.path })
    tpl.isBuiltIn = false
    tpl.path = meta.path
    return tpl
  }
  const user = readMockTemplates().find((t) => t.slug === slug)
  if (!user) throw new Error(`template not found: ${slug}`)
  return user
}

export async function writeUserTemplate(
  folder: string,
  slug: string,
  template: Template,
): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const dir = await invoke<string>('ensure_templates_dir', { folder })
    const safe = slug.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'template'
    const path = `${dir}/${safe}.md`
    const tpl: Template = { ...template, slug: safe, isBuiltIn: false, path }
    await invoke('write_template', { path, content: serializeTemplate(tpl) })
    return path
  }
  const safe = slug.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'template'
  const path = `${MOCK_TEMPLATES_DIR}/${safe}.md`
  const tpl: Template = { ...template, slug: safe, isBuiltIn: false, path }
  const list = readMockTemplates()
  const idx = list.findIndex((t) => t.slug === safe)
  if (idx >= 0) list[idx] = tpl
  else list.push(tpl)
  writeMockTemplates(list)
  return path
}

export async function deleteUserTemplate(path: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('delete_template', { path })
    return
  }
  const list = readMockTemplates().filter((t) => t.path !== path)
  writeMockTemplates(list)
}

export async function ensureTemplatesDir(folder: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string>('ensure_templates_dir', { folder })
  }
  return MOCK_TEMPLATES_DIR
}

type MockVersionMap = Record<string, VersionMeta[]>
type MockVersionContentMap = Record<string, string>

function readMockVersionIndex(): MockVersionMap {
  const raw = localStorage.getItem(MOCK_VERSIONS_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as MockVersionMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMockVersionIndex(map: MockVersionMap): void {
  localStorage.setItem(MOCK_VERSIONS_KEY, JSON.stringify(map))
}

function readMockVersionContent(): MockVersionContentMap {
  const raw = localStorage.getItem(MOCK_VERSIONS_CONTENT_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as MockVersionContentMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMockVersionContent(map: MockVersionContentMap): void {
  localStorage.setItem(MOCK_VERSIONS_CONTENT_KEY, JSON.stringify(map))
}

function contentKey(postId: string, ts: string): string {
  return `${postId}::${ts}`
}

function buildPreview(content: string): string {
  const parsed = parseFrontmatterSafe(content)
  const body = parsed ?? content
  const first = body
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  if (!first) return ''
  return first.length > 80 ? `${first.slice(0, 80)}…` : first
}

function parseFrontmatterSafe(content: string): string | null {
  try {
    const lines = content.split('\n')
    if (lines[0] !== '---') return null
    const endIdx = lines.indexOf('---', 1)
    if (endIdx < 0) return null
    return lines
      .slice(endIdx + 1)
      .join('\n')
      .replace(/^\n+/, '')
  } catch {
    return null
  }
}

function isoTsForFile(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}` +
    `.${pad(d.getUTCMilliseconds(), 3)}Z`
  )
}

function nowIso(): string {
  return new Date().toISOString()
}

export async function saveVersion(
  postId: string,
  folder: string,
  content: string,
): Promise<VersionMeta> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<VersionMeta>('save_version', { folder, postId, content })
  }
  const ts = isoTsForFile(new Date())
  const preview = buildPreview(content)
  const bytes = new TextEncoder().encode(content).length
  const meta: VersionMeta = { postId, ts, bytes, preview }

  const idx = readMockVersionIndex()
  const list = idx[postId] ?? []
  list.unshift(meta)
  while (list.length > MAX_VERSIONS_PER_POST) list.pop()
  idx[postId] = list
  writeMockVersionIndex(idx)

  const contents = readMockVersionContent()
  contents[contentKey(postId, ts)] = content
  writeMockVersionContent(contents)

  return meta
}

export async function listVersions(postId: string, folder: string): Promise<VersionMeta[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<VersionMeta[]>('list_versions', { folder, postId })
  }
  const idx = readMockVersionIndex()
  return [...(idx[postId] ?? [])]
}

export async function readVersion(
  postId: string,
  ts: string,
  folder: string,
): Promise<VersionContent> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<VersionContent>('read_version', { folder, postId, ts })
  }
  const contents = readMockVersionContent()
  const content = contents[contentKey(postId, ts)]
  if (content === undefined) throw new Error(`version not found: ${postId}@${ts}`)
  const meta = (readMockVersionIndex()[postId] ?? []).find((m) => m.ts === ts)

  let title = ''
  let updatedAt = ''
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (yamlMatch) {
    const yamlStr = yamlMatch[1] ?? ''
    const body = yamlMatch[2] ?? ''
    const titleMatch = yamlStr.match(/^title:\s*"?([^"\n]*)"?\s*$/m)
    if (titleMatch && titleMatch[1]) title = titleMatch[1]
    const updatedMatch = yamlStr.match(/^updatedAt:\s*"?([^"\n]*)"?\s*$/m)
    if (updatedMatch && updatedMatch[1]) updatedAt = updatedMatch[1]
    if (!title) {
      const first = body.split('\n').find((l) => l.trim())
      if (first) title = first.replace(/^#+\s*/, '').trim()
    }
  }
  return {
    postId,
    ts,
    content,
    updatedAt: updatedAt || meta?.ts || nowIso(),
    title: title || 'Untitled',
  }
}

export async function deleteVersionsForPost(postId: string, folder: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('delete_versions_for_post', { folder, postId })
    return
  }
  const idx = readMockVersionIndex()
  delete idx[postId]
  writeMockVersionIndex(idx)
  const contents = readMockVersionContent()
  const prefix = `${postId}::`
  for (const key of Object.keys(contents)) {
    if (key.startsWith(prefix)) delete contents[key]
  }
  writeMockVersionContent(contents)
}

export function resetMockData(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(MOCK_POSTS_KEY)
  localStorage.removeItem(MOCK_SEEDED_KEY)
  localStorage.removeItem(MOCK_SETTINGS_KEY)
  localStorage.removeItem(MOCK_TEMPLATES_KEY)
  localStorage.removeItem(MOCK_VERSIONS_KEY)
  localStorage.removeItem(MOCK_VERSIONS_CONTENT_KEY)
}

/**
 * Open the WebView's native print panel.
 *
 * - In Tauri (macOS wry backend), this invokes the `print_active_window`
 *   Rust command, which forwards to WKWebView's `printOperation` and
 *   surfaces the real macOS print sheet — the one with a "Save as PDF"
 *   dropdown at the bottom. The OS owns the destination, so we never
 *   learn the path the user picked.
 * - Outside Tauri (browser dev), falls back to `window.print()`.
 *
 * Throws if the native command fails (e.g. the backend has no
 * `printOperation` support). Callers should catch and surface the
 * error to the user.
 */
export async function printActiveWindow(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('print_active_window')
    return
  }
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
  }
}

function metaFromPost(p: Post): PostMeta {
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    type: p.type,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    scheduledFor: p.scheduledFor,
    publishedAt: p.publishedAt,
    tags: p.tags,
    template: p.template,
    path: p.path,
  }
}
