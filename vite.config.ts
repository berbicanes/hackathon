import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Served from https://berbicanes.github.io/hackathon/
export default defineConfig({
  base: '/hackathon/',
  plugins: [react()],
  build: { sourcemap: false },
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // The pure logic is unit tested; screens are covered by the e2e journey in e2e/.
      include: ['src/lib/**', 'src/i18n.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text-summary'],
      // Floor just under the current level, so coverage cannot silently decay.
      thresholds: { statements: 80, branches: 78, functions: 50, lines: 78 },
    },
  },
})
