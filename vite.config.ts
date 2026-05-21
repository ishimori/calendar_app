import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  root: path.resolve(__dirname, 'src/client'),
  plugins: [react()],
  server: {
    port: 5198,
    proxy: {
      '/api': 'http://localhost:3025',
    },
    fs: {
      allow: [path.resolve(__dirname, 'src')],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
  },
})
