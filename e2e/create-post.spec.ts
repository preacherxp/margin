import { test, expect } from '@playwright/test'
import { resetApp, seedFolderAndPosts } from './helpers'

test.describe('create post', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
    await seedFolderAndPosts(page)
    await page.reload()
    await expect(page.getByTestId('post-list')).toBeVisible()
  })

  test('creates a linkedin post and routes to the editor', async ({ page }) => {
    const title = 'E2E: a new linkedin post'
    await page.getByTestId('new-post-title').fill(title)
    await page.getByTestId('new-post-type').selectOption('linkedin')
    await page.getByTestId('create-post-btn').click()

    await expect(page.getByTestId('editor-view')).toBeVisible()
    await expect(page.getByTestId('title-input')).toHaveValue(title)
  })

  test('newly created post appears at the top of the list (newest updatedAt)', async ({ page }) => {
    const title = 'E2E: top of the list'
    await page.getByTestId('new-post-title').fill(title)
    await page.getByTestId('create-post-btn').click()

    await expect(page.getByTestId('editor-view')).toBeVisible()
    await page.getByTestId('editor-back-btn').click()
    await expect(page.getByTestId('post-list')).toBeVisible()

    const firstRow = page.getByTestId('post-row').first()
    await expect(firstRow).toHaveAttribute('data-post-title', title)
  })

  test('persists the new post in mock storage with a ULID and slugified filename', async ({ page }) => {
    const title = 'Hello, World!'
    await page.getByTestId('new-post-title').fill(title)
    await page.getByTestId('new-post-type').selectOption('blog')
    await page.getByTestId('create-post-btn').click()
    await expect(page.getByTestId('editor-view')).toBeVisible()

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('margin:posts')
      if (!raw) return null
      const posts = JSON.parse(raw) as Array<{ id: string; title: string; type: string; path: string }>
      return posts.find((p) => p.title === 'Hello, World!') ?? null
    })

    expect(stored).not.toBeNull()
    expect(stored!.type).toBe('blog')
    expect(stored!.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    expect(stored!.path).toMatch(/\/mock\/posts\/\d{4}-\d{2}-\d{2}-hello-world\.md$/)
  })

  test('create button is disabled when title is blank', async ({ page }) => {
    await expect(page.getByTestId('create-post-btn')).toBeDisabled()
    await page.getByTestId('new-post-title').fill('   ')
    await expect(page.getByTestId('create-post-btn')).toBeDisabled()
  })
})
