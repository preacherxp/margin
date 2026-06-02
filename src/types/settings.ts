export type Theme = 'dark' | 'light' | 'system'

export interface AppSettings {
  postsFolder: string | null
  theme: Theme
}

export const DEFAULT_SETTINGS: AppSettings = {
  postsFolder: null,
  theme: 'dark',
}
