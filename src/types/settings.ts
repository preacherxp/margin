export const THEMES = ['dark', 'light', 'sepia', 'high-contrast', 'nord', 'system'] as const

export type Theme = (typeof THEMES)[number]

export function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value)
}

export interface AppSettings {
  postsFolder: string | null
  theme: Theme
}

export const DEFAULT_SETTINGS: AppSettings = {
  postsFolder: null,
  theme: 'dark',
}
