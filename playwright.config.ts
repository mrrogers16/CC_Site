import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  // CRITICAL: Optimize for CI speed
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Reduce retries from 2 to 1
  workers: process.env.CI ? 3 : 4, // Increase workers from 1 to 3
  timeout: 20000, // Increased timeout for database-dependent tests
  expect: { timeout: 10000 }, // Increased expect timeout for slower CI

  globalSetup: require.resolve("./tests/setup/global-setup.ts"),

  reporter: process.env.CI
    ? [
        ["github"], // GitHub annotations
        ["html", { open: "never" }], // HTML report but don't open
      ]
    : "html",

  // CRITICAL: Optimize for speed
  use: {
    baseURL: "http://localhost:3000",
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Speed up navigation
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  // Keep device projects but optimize for CI
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Skip other browsers in CI for speed, keep for local testing
    ...(process.env.CI
      ? []
      : [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]),
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    // Skip Mobile Safari in CI for speed
    ...(process.env.CI
      ? []
      : [{ name: "Mobile Safari", use: { ...devices["iPhone 12"] } }]),
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI, // Reuse in dev, fresh server in CI
    timeout: 120000, // Increased timeout for initial build
  },
});
