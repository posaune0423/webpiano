import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "pwa.spec.ts",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:8787",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run preview",
    url: "http://localhost:8787",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
