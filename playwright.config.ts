import { defineConfig, devices } from '@playwright/test'

// E2E_BASE_URL points the same journey at the deployed site (post-deploy smoke check).
const PORT = 4173
const remote = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: remote ? 2 : 0,
  reporter: 'list',
  use: { baseURL: remote ?? `http://${'localhost'}:${PORT}/hackathon/` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: remote
    ? undefined
    : { command: `npm run preview -- --port ${PORT} --strictPort`, port: PORT, reuseExistingServer: !process.env.CI },
})
