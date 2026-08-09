import { test, expect } from "@playwright/test";

test.describe("Critical User Flows", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Verify key elements load quickly
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("services page displays correctly", async ({ page }) => {
    await page.goto("/services", { waitUntil: "domcontentloaded" });

    // Use specific heading selector to avoid strict mode violations
    await expect(
      page.getByRole("heading", { name: "Our Services" })
    ).toBeVisible();
    // Check that service content loads (may be empty in test environment)
    await expect(page.locator("main")).toBeVisible();
  });

  test("contact page loads correctly", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /contact us/i })
    ).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });
});
