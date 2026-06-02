import { expect, type Page } from '@playwright/test'

const MOCK_POSTS_KEY = 'margin:posts'
const MOCK_SEEDED_KEY = 'margin:posts:seeded'
const MOCK_SETTINGS_KEY = 'margin:settings'

export const MOCK_FOLDER = '/mock/posts'

export const SAMPLE_TITLES = [
  'The day I shipped my first side project',
  '5 things I wish I knew about prompt engineering',
  'Hot take: the best LinkedIn hook is short',
  'How to draft a blog post in 90 minutes',
]

export async function resetApp(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([postsKey, seededKey, settingsKey]: string[]) => {
      localStorage.removeItem(postsKey)
      localStorage.removeItem(seededKey)
      localStorage.removeItem(settingsKey)
    },
    [MOCK_POSTS_KEY, MOCK_SEEDED_KEY, MOCK_SETTINGS_KEY],
  )
  await page.reload()
  await expect(page.getByTestId('app-shell')).toBeVisible()
}

export async function seedFolderAndPosts(
  page: Page,
  options: { suppressSeeding?: boolean; folder?: string | null } = {},
): Promise<void> {
  const { suppressSeeding = false, folder = MOCK_FOLDER } = options
  await page.evaluate(
    ([_postsKey, seededKey, settingsKey, f, suppress]: [string, string, string, string | null, boolean]) => {
      if (!suppress) {
        localStorage.setItem(seededKey, '1')
      } else {
        localStorage.removeItem(seededKey)
      }
      localStorage.setItem(
        settingsKey,
        JSON.stringify({ postsFolder: f, theme: 'dark' }),
      )
    },
    [MOCK_POSTS_KEY, MOCK_SEEDED_KEY, MOCK_SETTINGS_KEY, folder, suppressSeeding],
  )
}

export async function chooseFolder(page: Page): Promise<void> {
  await page.getByTestId('choose-folder-btn').first().click()
  await expect(page.getByTestId('post-list')).toBeVisible()
}

export async function expectPostRow(
  page: Page,
  title: string,
): Promise<void> {
  const row = page.locator(`[data-testid="post-row"][data-post-title="${cssEscape(title)}"]`)
  await expect(row).toBeVisible()
}

export async function openPostByTitle(page: Page, title: string): Promise<void> {
  const row = page.locator(`[data-testid="post-row"][data-post-title="${cssEscape(title)}"]`)
  await row.click()
  await expect(page.getByTestId('editor-view')).toBeVisible()
}

export async function goBackToPosts(page: Page): Promise<void> {
  await page.getByTestId('editor-back-btn').click()
  await expect(page.getByTestId('home-view')).toBeVisible()
}

export async function clearMockData(page: Page): Promise<void> {
  await page.evaluate(
    ([postsKey, seededKey, settingsKey]: string[]) => {
      localStorage.removeItem(postsKey)
      localStorage.removeItem(seededKey)
      localStorage.removeItem(settingsKey)
    },
    [MOCK_POSTS_KEY, MOCK_SEEDED_KEY, MOCK_SETTINGS_KEY],
  )
}

export function getMockPosts(): Promise<Array<Record<string, unknown>>> {
  return Promise.resolve([])
}

export function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/(["\\])/g, '\\$1')
}
