import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://berbicanes.github.io/hackathon/
export default defineConfig({
  base: '/hackathon/',
  plugins: [react()],
  build: { sourcemap: false },
})
