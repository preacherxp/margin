import { test, expect } from '@playwright/test'
import { resetApp, seedFolderAndPosts, chooseFolder } from './helpers'

test.describe('settings persistence', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('folder survives a reload', async ({ page }) => {
    await chooseFolder(page)
    await expect(page.getByTestId('env-folder')).toHaveText('/mock/posts')

    await page.reload()
    await expect(page.getByTestId('env-folder')).toHaveText('/mock/posts')
    await expect(page.getByTestId('post-list')).toBeVisible()
  })

  test('change folder returns the app to the empty state', async ({ page }) => {
    await seedFolderAndPosts(page)
    await page.reload()
    await expect(page.getByTestId('post-list')).toBeVisible()

    await page.getByTestId('change-folder-btn').click()
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('env-folder')).toHaveText('No folder selected')
  })

  test('theme persists across reload', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'margin:settings',
        JSON.stringify({ postsFolder: '/mock/posts', theme: 'light' }),
      )
    })
    await page.reload()
    const theme = await page.evaluate(() => {
      const raw = localStorage.getItem('margin:settings')
      return raw ? (JSON.parse(raw) as { theme: string }).theme : null
    })
    expect(theme).toBe('light')
  })
})
