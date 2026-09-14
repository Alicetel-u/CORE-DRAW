import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const coreDrawBase = (globalThis as { process?: { env?: { CORE_DRAW_BASE?: string } } }).process?.env?.CORE_DRAW_BASE || '/'

export default defineConfig({
  base: coreDrawBase,
  plugins: [react()],
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
