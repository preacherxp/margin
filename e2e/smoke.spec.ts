import { test, expect } from '@playwright/test'
import { resetApp } from './helpers'

test.describe('smoke', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('renders the app shell with brand and env badge', async ({ page }) => {
    await expect(page.getByTestId('app-shell')).toBeVisible()
    await expect(page.getByTestId('top-bar')).toBeVisible()
    await expect(page.getByTestId('brand')).toContainText('Margin')
  })

  test('shows browser mock env badge when not running in Tauri', async ({ page }) => {
    await expect(page.getByTestId('env-value')).toHaveText('browser (mock data)')
  })

  test('shows the folder-picker empty state on first run', async ({ page }) => {
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('choose-folder-btn').first()).toBeVisible()
  })
})
