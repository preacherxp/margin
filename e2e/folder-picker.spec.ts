import { test, expect } from '@playwright/test'
import { resetApp, expectPostRow, SAMPLE_TITLES } from './helpers'

test.describe('folder picker', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('empty state -> choose folder -> list appears with seeded posts', async ({ page }) => {
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('post-list')).toHaveCount(0)

    await page.getByTestId('choose-folder-btn').first().click()

    await expect(page.getByTestId('post-list')).toBeVisible()
    await expect(page.getByTestId('empty-state')).toHaveCount(0)

    const rows = page.getByTestId('post-row')
    await expect(rows).toHaveCount(4)

    for (const title of SAMPLE_TITLES) {
      await expectPostRow(page, title)
    }
  })

  test('top bar folder badge shows the mock folder after picking', async ({ page }) => {
    await page.getByTestId('choose-folder-btn').first().click()
    await expect(page.getByTestId('env-folder')).toHaveText('/mock/posts')
  })

  test('header actions change from "Choose folder" to "Refresh" / "Change folder"', async ({ page }) => {
    await expect(page.getByTestId('choose-folder-btn')).toHaveCount(1)
    await page.getByTestId('choose-folder-btn').first().click()
    await expect(page.getByTestId('refresh-btn')).toBeVisible()
    await expect(page.getByTestId('change-folder-btn')).toBeVisible()
    await expect(page.getByTestId('choose-folder-btn')).toHaveCount(0)
  })
})
