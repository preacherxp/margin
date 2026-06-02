import { test, expect } from '@playwright/test'

test('shows the home view with brand and folder picker', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Margin').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /choose folder/i }).first()).toBeVisible()
})
