import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Post, PostMeta, PostStatus, PostType, Template } from '@/types/post'
import {
  deletePost,
  deleteVersionsForPost,
  listPosts,
  readPost,
  readTemplateBySlug,
  saveVersion,
  writePost,
} from '@/lib/tauri-bridge'
import { serializeFrontmatter } from '@/lib/frontmatter'
import { newId } from '@/lib/id'
import { resolvePostsDir } from '@/lib/posts-dir'
import { useSettingsStore } from './settings'

export const usePostsStore = defineStore('posts', () => {
  const items = ref<PostMeta[]>([])
  const current = ref<Post | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const templates = ref<PostMeta[]>([])

  const count = computed(() => items.value.length)
  const byStatus = computed(() => {
    const out: Record<PostStatus, number> = {
      draft: 0,
      scheduled: 0,
      published: 0,
      archived: 0,
    }
    for (const p of items.value) out[p.status]++
    return out
  })

  async function refresh() {
    const settings = useSettingsStore()
    if (!settings.postsFolder) {
      items.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      items.value = await listPosts(settings.postsFolder)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function open(path: string) {
    loading.value = true
    error.value = null
    try {
      current.value = await readPost(path)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function close() {
    current.value = null
  }

  async function save(post: Post, options?: { snapshot?: boolean }) {
    saving.value = true
    error.value = null
    const settings = useSettingsStore()
    const folder = settings.postsFolder
    const prev = current.value
    const snapshot = options?.snapshot ?? true
    try {
      const stamped: Post = {
        ...post,
        updatedAt: new Date().toISOString(),
        versions: snapshot ? (post.versions ?? 0) + 1 : (post.versions ?? 0),
      }
      const content = serializeFrontmatter(stamped)
      await writePost(stamped.path, content)
      if (
        snapshot &&
        folder &&
        prev &&
        prev.id === stamped.id &&
        prev.path === stamped.path
      ) {
        const prevContent = serializeFrontmatter(prev)
        try {
          await saveVersion(stamped.id, folder, prevContent)
        } catch (e) {
          console.warn('saveVersion failed', e)
        }
      }
      current.value = stamped
      await refresh()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      saving.value = false
    }
  }

  async function create(input: {
    title: string
    type: PostType
    template?: string | null
    tags?: string[]
  }): Promise<Post> {
    const settings = useSettingsStore()
    if (!settings.postsFolder) throw new Error('no posts folder selected')

    const now = new Date().toISOString()
    const id = newId()
    const slug = slugify(input.title) || 'untitled'
    const datePrefix = now.slice(0, 10)
    const filename = `${datePrefix}-${slug}.md`
    const path = `${resolvePostsDir(settings.postsFolder)}/${filename}`

    const post: Post = {
      id,
      title: input.title,
      status: 'draft',
      type: input.type,
      createdAt: now,
      updatedAt: now,
      scheduledFor: null,
      publishedAt: null,
      tags: input.tags ?? [],
      template: input.template ?? null,
      path,
      linkedin: { hook: '', cta: '', hashtags: [], audience: '' },
      assets: [],
      versions: 0,
      body: '',
    }

    const content = serializeFrontmatter(post)
    await writePost(path, content)
    await refresh()
    return post
  }

  async function createFromTemplate(input: {
    templateSlug: string
    title?: string
    type?: PostType
  }): Promise<Post> {
    const settings = useSettingsStore()
    if (!settings.postsFolder) throw new Error('no posts folder selected')

    const template: Template = await readTemplateBySlug(
      input.templateSlug,
      settings.postsFolder,
    )

    const now = new Date().toISOString()
    const id = newId()
    const title = (input.title?.trim() || template.name) || 'Untitled'
    const type: PostType = input.type ?? template.type
    const slug = slugify(title) || 'untitled'
    const datePrefix = now.slice(0, 10)
    const filename = `${datePrefix}-${slug}.md`
    const path = `${resolvePostsDir(settings.postsFolder)}/${filename}`

    const post: Post = {
      id,
      title,
      status: 'draft',
      type,
      createdAt: now,
      updatedAt: now,
      scheduledFor: null,
      publishedAt: null,
      tags: [...template.tags],
      template: template.slug,
      path,
      linkedin: { ...template.linkedin },
      assets: [],
      versions: 0,
      body: template.body,
    }

    const content = serializeFrontmatter(post)
    await writePost(path, content)
    await refresh()
    return post
  }

  async function remove(path: string) {
    error.value = null
    const settings = useSettingsStore()
    const folder = settings.postsFolder
    const targetId = current.value?.path === path ? current.value.id : null
    try {
      await deletePost(path)
      if (folder && targetId) {
        try {
          await deleteVersionsForPost(targetId, folder)
        } catch (e) {
          console.warn('deleteVersionsForPost failed', e)
        }
      }
      if (current.value?.path === path) current.value = null
      await refresh()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    }
  }

  return {
    items,
    current,
    loading,
    saving,
    error,
    templates,
    count,
    byStatus,
    refresh,
    open,
    close,
    save,
    create,
    createFromTemplate,
    remove,
  }
})

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
