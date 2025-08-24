import { test, expect } from "@playwright/test";

test.describe("Critical User Flows", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");

    // Verify key elements load quickly
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("services page displays correctly", async ({ page }) => {
    await page.goto("/services");

    await expect(
      page.getByRole("heading", { name: /services/i })
    ).toBeVisible();
    // Check that at least one service card exists
    await expect(
      page.locator('[data-testid="service-card"]').first()
    ).toBeVisible();
  });

  test("contact page loads correctly", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: /contact us/i })
    ).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });

  test("authentication pages exist", async ({ page }) => {
    // Test login page
    await page.goto("/auth/login", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    // Test register page
    await page.goto("/auth/register", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /register/i })
    ).toBeVisible();
  });

  test("booking page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/book");

    // Should redirect to login for unauthenticated users
    await expect(page).toHaveURL(/login/);
  });
});
