import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const packageVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string

const appVersionPlugin = {
  name: 'core-draw-app-version',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.replaceAll('\\', '/').endsWith('/src/App.tsx')) return null
    return code.replace(/const APP_VERSION = 'v[^']+'/u, `const APP_VERSION = 'v${packageVersion}'`)
  },
}

export default defineConfig({
  plugins: [appVersionPlugin, react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
