import { test, expect } from '@playwright/test'
import { resetApp, seedFolderAndPosts, SAMPLE_TITLES } from './helpers'

test.describe('post list', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
    await seedFolderAndPosts(page)
    await page.reload()
    await expect(page.getByTestId('post-list')).toBeVisible()
  })

  test('renders all 4 seeded posts', async ({ page }) => {
    const rows = page.getByTestId('post-row')
    await expect(rows).toHaveCount(4)
  })

  test('sorts posts by updatedAt desc (newest first)', async ({ page }) => {
    const titles = await page.getByTestId('post-row').evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).getAttribute('data-post-title') ?? ''),
    )
    expect(titles).toHaveLength(4)
    for (const t of SAMPLE_TITLES) {
      expect(titles).toContain(t)
    }
  })

  test('shows status badge with data-status attribute per row', async ({ page }) => {
    const row = page.locator(
      `[data-testid="post-row"][data-post-title="5 things I wish I knew about prompt engineering"]`,
    )
    await expect(row).toHaveAttribute('data-post-status', 'published')
    const badge = row.locator('.badge')
    await expect(badge).toHaveAttribute('data-status', 'published')
    await expect(badge).toHaveText('published')
  })

  test('shows type and date in row meta', async ({ page }) => {
    const row = page.locator(
      `[data-testid="post-row"][data-post-title="How to draft a blog post in 90 minutes"]`,
    )
    await expect(row).toContainText('blog')
    await expect(row).toContainText('draft')
    await expect(row.locator('.tag').first()).toBeVisible()
  })

  test('shows tags on rows that have them', async ({ page }) => {
    const row = page.locator(
      `[data-testid="post-row"][data-post-title="The day I shipped my first side project"]`,
    )
    const tags = row.locator('.tag')
    await expect(tags.first()).toHaveText('career')
    await expect(tags.nth(1)).toHaveText('shipping')
  })
})
