import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

const devOnly = (plugin: Plugin): Plugin => ({ ...plugin, apply: 'serve' })

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    // Only attach Vue DevTools in dev. The `apply` filter strips it from
    // production builds without needing the callback form of defineConfig,
    // which keeps `mergeConfig` happy in vitest.config.ts.
    devOnly(vueDevTools() as Plugin),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: 'localhost',
  },
  envPrefix: ['VITE_', 'TAURI_'],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('@tiptap') ||
            id.includes('tiptap-markdown') ||
            id.includes('prosemirror')
          ) {
            return 'vendor-tiptap'
          }
          if (id.includes('minisearch')) return 'vendor-minisearch'
          if (id.includes('yaml')) return 'vendor-yaml'
          if (
            id.includes('/vue/') ||
            id.includes('/vue-router/') ||
            id.includes('/pinia/')
          ) {
            return 'vendor-vue'
          }
          if (id.includes('@tauri-apps')) return 'vendor-tauri'
          return 'vendor'
        },
      },
    },
  },
})




