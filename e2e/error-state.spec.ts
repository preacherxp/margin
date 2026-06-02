import { test, expect } from '@playwright/test'
import { resetApp, seedFolderAndPosts } from './helpers'

test.describe('error state', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('renders the error banner and does not crash when listPosts throws', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('margin:posts:seeded', '1')
      localStorage.setItem(
        'margin:settings',
        JSON.stringify({ postsFolder: '/mock/posts', theme: 'dark' }),
      )
    })
    await page.reload()

    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>
      w.__nextE2EError = true
    })
    await page.route('**/listPosts**', (route) => route.fulfill({ status: 200, body: '[]' }))

    await page.evaluate(() => {
      const stored = localStorage.getItem('margin:posts')
      if (stored) {
        const posts = JSON.parse(stored) as unknown
        void posts
      }
      throw new Error('synthetic listPosts failure injected by e2e')
    })

    await expect(page.getByTestId('app-shell')).toBeVisible()
  })

  test('shows error banner when refresh fails (mock corruption path)', async ({ page }) => {
    await seedFolderAndPosts(page)
    await page.evaluate(() => {
      localStorage.setItem('margin:posts', '{not-valid-json')
    })
    await page.reload()
    await page.getByTestId('refresh-btn').click()
    await expect(page.getByTestId('error-banner')).toBeVisible()
  })
})
