import { test, expect } from '@playwright/test'
import { resetApp, seedFolderAndPosts } from './helpers'

test.describe('empty state', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('shows full empty state when no folder is selected', async ({ page }) => {
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('empty-state')).toContainText('Pick a folder to store your posts')
  })

  test('shows small "no posts" empty state when folder is picked but seeding is suppressed', async ({ page }) => {
    await seedFolderAndPosts(page, { suppressSeeding: true })
    await page.reload()
    await expect(page.getByTestId('no-posts-empty')).toBeVisible()
    await expect(page.getByTestId('no-posts-empty')).toContainText('No posts yet')
    await expect(page.getByTestId('post-list')).toHaveCount(0)
  })
})
