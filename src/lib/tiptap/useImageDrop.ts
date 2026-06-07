import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { copyAsset, ensureAssetsDir, isTauri } from '@/lib/tauri-bridge'
import type { EditorRef } from './usePostEditor'

export interface UseImageDropOptions {
  editor: EditorRef
  postsDir: Ref<string | null>
  onAssetAdded?: (relPath: string) => void
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i

function isImagePath(p: string): boolean {
  return IMAGE_EXT.test(p)
}

async function copyPathsToAssets(
  paths: string[],
  postsDir: string,
): Promise<{ rel: string; abs: string }[]> {
  const assetsDir = await ensureAssetsDir(postsDir)
  const imagePaths = paths.filter(isImagePath)
  if (imagePaths.length === 0) return []
  const copied = await Promise.all(
    imagePaths.map(async (p) => {
      const res = await copyAsset(p, assetsDir)
      return { rel: res.relPath, abs: res.absPath }
    }),
  )
  return copied
}

function insertImages(editor: Editor, rels: string[]) {
  if (rels.length === 0) return
  const nodes = rels.map((r) => `![image](${r})`).join('\n\n')
  editor.chain().focus().insertContent(nodes).run()
}

export function useImageDrop(options: UseImageDropOptions): void {
  let unlisten: (() => void) | null = null

  onMounted(async () => {
    if (!isTauri()) return
    const { getCurrentWebview } = await import('@tauri-apps/api/webview')
    const webview = getCurrentWebview()
    unlisten = await webview.onDragDropEvent(async (event) => {
      if (event.payload.type !== 'drop') return
      const ed = options.editor.value
      const dir = options.postsDir.value
      if (!ed || !dir) return
      const paths = event.payload.paths
      try {
        const copied = await copyPathsToAssets(paths, dir)
        insertImages(
          ed,
          copied.map((c) => c.rel),
        )
        copied.forEach((c) => options.onAssetAdded?.(c.rel))
      } catch (e) {
        console.error('image drop failed', e)
      }
    })
  })

  onBeforeUnmount(() => {
    unlisten?.()
    unlisten = null
  })
}
