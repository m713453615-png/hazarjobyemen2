import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Bind on every interface so the sandbox preview can reach the dev server.
    host: '0.0.0.0',
    // The preview is served through a generated hostname, so the host header
    // cannot be pinned to a fixed list here.
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
