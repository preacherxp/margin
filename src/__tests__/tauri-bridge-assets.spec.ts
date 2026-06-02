import { describe, it, expect, beforeEach, vi } from 'vitest'
import { copyAsset, ensureAssetsDir, isTauri } from '@/lib/tauri-bridge'

describe('tauri-bridge asset commands (mock mode)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { ...globalThis.window })
  })

  it('detects mock mode outside Tauri', () => {
    expect(isTauri()).toBe(false)
  })

  it('returns a synthetic copied asset', async () => {
    const dest = '/posts/folder'
    const res = await copyAsset('/Users/me/Pictures/foo.png', dest)
    expect(res.relPath).toBe('assets/foo.png')
    expect(res.absPath).toBe('/posts/folder/foo.png')
    expect(res.name).toBe('foo.png')
  })

  it('ensures an assets dir under the posts dir', async () => {
    const res = await ensureAssetsDir('/posts/folder')
    expect(res).toBe('/posts/folder/assets')
  })
})
